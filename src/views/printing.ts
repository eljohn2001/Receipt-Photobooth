import { BaseView } from './base';
import { audioManager } from '../services/audio';
import type { AppSession } from '../types';
import { generateReceiptEscPos, generateReceiptBlob, uint8ArrayToBase64 } from '../services/download';
import { Capacitor, registerPlugin } from '@capacitor/core';
import { loadKioskConfig, saveKioskConfig } from '../services/config';
import { saveLocalSession } from '../services/db';
import { getDeviceUUID } from '../services/license';
import { syncPendingSessions } from '../services/sync';
import { generateShortId } from '../services/supabase';

interface DirectPrinterPlugin {
  printRawUsb(options: { base64Data: string }): Promise<void>;
  printRawBluetooth(options: { base64Data: string }): Promise<void>;
  savePhotoToGallery(options: { base64Data: string }): Promise<void>;
}

const DirectPrinter = registerPlugin<DirectPrinterPlugin>('DirectPrinter');

export class PrintingView extends BaseView {
  private transitionTimeoutId: number | null = null;
  private activeSession: AppSession;

  constructor(
    element: HTMLElement,
    navigateTo: (state: any, params?: any) => void,
    session: AppSession
  ) {
    super(element, navigateTo);
    this.activeSession = session;
  }

  mount(): void {
    this.element.innerHTML = `
      <div class="printing-screen-content">
        <div class="kiosk-app-bar">
          <div class="kiosk-app-bar-titles">
            <h2 class="kiosk-screen-title printing-headline">Printing Receipt</h2>
            <p class="kiosk-screen-subtitle printing-subline">Virtually feeding thermal paper</p>
          </div>
        </div>

        <!-- Virtual Printer Hardware Mock -->
        <div class="virtual-printer-box">
          <div class="printer-body">
            <div class="printer-status-led"></div>
            <div class="printer-slot-opening"></div>
            
            <!-- Paper rolls up out of the slot -->
            <div class="printed-paper-delivery">
              <div class="thermal-paper" id="delivery-paper-content" style="transform: translateY(-100%);">
                <!-- Injected dynamically on enter -->
              </div>
            </div>
          </div>
        </div>
        
        <div class="printing-footer-hint-group">
          <div class="printing-footer-hint" id="printing-hint-box">
            <p>Please complete the system print dialog.</p>
          </div>
          <!-- Proceed action button shown after printing completes -->
          <div class="printing-proceed-container hidden" id="printing-proceed-container">
            <button class="btn btn-primary btn-glow" id="btn-printing-proceed" style="min-width: 220px;">
              VIEW QR CODE ➔
            </button>
          </div>
        </div>
      </div>
    `;
  }

  unmount(): void {
    audioManager.stopDispenser();
    this.clearTimers();
  }

  async onEnter(): Promise<void> {
    const deliveryContent = this.element.querySelector('#delivery-paper-content') as HTMLElement;
    const previewContent = document.getElementById('receipt-content-target');
    const proceedContainer = this.element.querySelector('#printing-proceed-container') as HTMLElement;
    const printingSpinner = this.element.querySelector('#printing-spinner') as HTMLElement;
    const headlineEl = this.element.querySelector('.printing-headline');
    const sublineEl = this.element.querySelector('.printing-subline');
    const hintBoxEl = this.element.querySelector('#printing-hint-box');
    
    // 1. Immediately inject receipt HTML content into the delivery paper and trigger downward feeding animation right away
    if (deliveryContent && previewContent) {
      deliveryContent.innerHTML = previewContent.innerHTML;
      deliveryContent.classList.add('printed-paper-animation');
    }
    if (proceedContainer) proceedContainer.classList.add('hidden');
    if (printingSpinner) printingSpinner.classList.remove('hidden');
    if (headlineEl) headlineEl.textContent = 'PRINTING RECEIPT...';
    if (sublineEl) sublineEl.textContent = 'Virtually feeding thermal paper';
    if (hintBoxEl) {
      hintBoxEl.innerHTML = '<p>Please collect your print when paper stops feeding.</p>';
    }

    // Play physical motor hum sound right away as paper starts feeding
    audioManager.playDispenser();

    // Wait for the background QR code upload to complete if active, to ensure the correct QR code is printed
    if (this.activeSession.uploadPromise) {
      try {
        await this.activeSession.uploadPromise;
      } catch (err) {
        console.error('Failed to resolve uploadPromise during printing:', err);
      }
    }

    const isNative = Capacitor.isNativePlatform();
    let printSucceeded = false;

    if (isNative) {
      const copies = this.activeSession.copiesCount || 1;
      try {
        if (headlineEl) {
          headlineEl.textContent = 'GENERATING PRINT DATA...';
        }
        audioManager.playDispenser();
        
        // Generate single copy ESC/POS bytes
        const singleCopyBytes = await generateReceiptEscPos(this.activeSession);
        
        // Concatenate copies into a single print stream with clean copy separator line feed
        const copySeparator = new Uint8Array([0x0A]);
        const copyLen = singleCopyBytes.length;
        const totalLength = (copyLen + copySeparator.length) * copies - copySeparator.length;
        const escPosBytes = new Uint8Array(totalLength);
        let offset = 0;
        for (let i = 0; i < copies; i++) {
          escPosBytes.set(singleCopyBytes, offset);
          offset += copyLen;
          if (i < copies - 1) {
            escPosBytes.set(copySeparator, offset);
            offset += copySeparator.length;
          }
        }
        
        const base64Data = uint8ArrayToBase64(escPosBytes);
        
        const config = loadKioskConfig();
        const isBluetooth = config.printerMode === 'bluetooth';

        if (headlineEl) {
          headlineEl.textContent = isBluetooth 
            ? 'SENDING TO BLUETOOTH PRINTER...' 
            : 'SENDING TO USB PRINTER...';
        }
        
        let printSuccess = false;
        let printError: any = null;
        
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            if (isBluetooth) {
              await DirectPrinter.printRawBluetooth({ base64Data });
            } else {
              await DirectPrinter.printRawUsb({ base64Data });
            }
            printSuccess = true;
            break;
          } catch (err) {
            printError = err;
            console.warn(`Direct print attempt ${attempt} failed:`, err);
            if (attempt < 3) {
              if (headlineEl) {
                headlineEl.textContent = `PRINTER BUSY, RETRYING (${attempt}/2)...`;
              }
              await new Promise((resolve) => setTimeout(resolve, 3000));
            }
          }
        }

        if (!printSuccess) {
          throw printError || new Error('Direct print transfer failed');
        }
        
        printSucceeded = true;
        audioManager.stopDispenser();

        // Auto-save branded full-color receipt collage to native gallery after print completes
        if (config.saveToGallery !== false) {
          (async () => {
            try {
              console.log('Generating full-color receipt collage for gallery auto-save...');
              let colorBlob = this.activeSession.colorBlob;
              if (!colorBlob) {
                colorBlob = await generateReceiptBlob(this.activeSession, 'color');
              }
              
              const base64Data = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  const dataUrl = reader.result as string;
                  const base64 = dataUrl.split(',')[1];
                  resolve(base64);
                };
                reader.onerror = reject;
                reader.readAsDataURL(colorBlob!);
              });

              await DirectPrinter.savePhotoToGallery({ base64Data });
              console.log('Branded full-color receipt collage auto-saved to gallery successfully.');
            } catch (err) {
              console.error('Error auto-saving receipt collage to gallery:', err);
            }
          })();
        }

      } catch (e: any) {
        const config = loadKioskConfig();
        const isBluetooth = config.printerMode === 'bluetooth';
        console.error('Direct print failed after retries:', e);
        alert((isBluetooth ? 'Direct Bluetooth print failed: ' : 'Direct USB print failed: ') + (e.message || e));
        audioManager.stopDispenser();
      }
    } else {
      const copies = this.activeSession.copiesCount || 1;
      try {
        for (let i = 0; i < copies; i++) {
          if (headlineEl) {
            headlineEl.textContent = copies > 1 
              ? `PREPARING COPY ${i + 1} OF ${copies}...`
              : 'PREPARING YOUR PRINT...';
          }
          audioManager.playDispenser();
          await this.triggerWindowPrint();
          audioManager.stopDispenser();
          if (i < copies - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }
        printSucceeded = true;
      } catch (e) {
        console.error('Error during printing loop:', e);
      }
    }

    // --- Print loop is finished ---
    // Record session transaction locally in IndexedDB (Offline-First) if print succeeded or on web
    if (printSucceeded || !isNative) {
      try {
        const config = loadKioskConfig();
        const deviceId = await getDeviceUUID();
        const pkg = this.activeSession.selectedPackage;
      const copies = this.activeSession.copiesCount || (pkg ? pkg.printsCount : 1);

      // Decrement paper roll counter
      const currentRemaining = config.paperPrintsRemaining !== undefined ? config.paperPrintsRemaining : (config.paperMaxPrints || 150);
      config.paperPrintsRemaining = Math.max(0, currentRemaining - copies);
      saveKioskConfig(config);
      
      let totalAmount = 0;
      let packageName = null;
      let packagePrice = null;
      
      if (config.enableEventMode === true) {
        totalAmount = 0;
        packageName = 'Event Mode Print';
        packagePrice = 0;
      } else if (this.activeSession.selectedTemplateId === 'comfort-card') {
        totalAmount = 0; // Comfort Affirmations are free
        packageName = 'Comfort Card';
        packagePrice = 0;
      } else if (pkg) {
        totalAmount = pkg.price;
        packageName = pkg.name;
        packagePrice = pkg.price;
      } else {
        // Fallback for older sessions or custom setups
        totalAmount = config.sessionPrice !== undefined ? config.sessionPrice : 30.00;
        packageName = 'Standard Package';
        packagePrice = totalAmount;
      }
      
      const newSessionRecord = {
        id: this.activeSession.shareId || generateShortId(6),
        boothId: deviceId,
        createdAt: new Date().toISOString(),
        layoutType: this.activeSession.selectedTemplateId === 'comfort-card' ? 'comfort-card' : 'photo',
        templateId: this.activeSession.selectedTemplateId || 'unknown',
        printsCount: copies,
        additionalPrints: 0,
        totalAmount: totalAmount,
        shareId: this.activeSession.shareId || null,
        syncStatus: 'pending' as const,
        packageName: packageName,
        packagePrice: packagePrice,
        completionStatus: 'completed' as const
      };
      
      await saveLocalSession(newSessionRecord);
      console.log('[Printing] Transaction logged locally:', newSessionRecord);
      
      // Fire background sync asynchronously
      syncPendingSessions().then(({ successCount }) => {
        console.log(`[Printing] Auto-sync completed. Synced ${successCount} sessions.`);
      }).catch(err => {
        console.error('[Printing] Auto-sync background error:', err);
      });
      } catch (err) {
        console.error('[Printing] Failed to log transaction locally:', err);
      }
    }

    // Now trigger the screen eject animation and physical tear guidelines!
    if (headlineEl) headlineEl.textContent = 'EJECTING RECEIPT...';
    if (sublineEl) sublineEl.textContent = 'Virtually feeding thermal paper';
    if (printingSpinner) printingSpinner.classList.add('hidden');
    if (hintBoxEl) {
      hintBoxEl.innerHTML = '<p>Tear carefully when paper stops feeding.</p>';
    }

    if (deliveryContent) {
      // Trigger CSS animation
      deliveryContent.classList.add('printed-paper-animation');
    }

    // Play physical motor hum sound for the duration of the screen eject
    audioManager.playDispenser();
    
    // Show proceed button immediately once printing finishes
    if (proceedContainer) {
      proceedContainer.classList.remove('hidden');
    }

    const AUTO_TRANSITION_TIME = 3000; // 3 seconds (matches receipt-eject CSS animation duration)
    
    const stopAudioAndGo = () => {
      audioManager.stopDispenser();
      this.navigateTo('finished');
    };

    // Auto-transition to finished view after animation finishes
    this.transitionTimeoutId = window.setTimeout(stopAudioAndGo, AUTO_TRANSITION_TIME);

    // Set up click handler on proceed button to bypass remaining time
    const proceedBtn = this.element.querySelector('#btn-printing-proceed');
    if (proceedBtn) {
      const newProceedBtn = proceedBtn.cloneNode(true) as HTMLButtonElement;
      proceedBtn.parentNode?.replaceChild(newProceedBtn, proceedBtn);
      
      newProceedBtn.addEventListener('click', () => {
        this.clearTimers();
        stopAudioAndGo();
      });
    }
  }

  onLeave(): void {
    audioManager.stopDispenser();
    this.clearTimers();
  }

  private clearTimers() {
    if (this.transitionTimeoutId !== null) {
      window.clearTimeout(this.transitionTimeoutId);
      this.transitionTimeoutId = null;
    }
  }

  private async triggerWindowPrint() {
    const printTarget = document.getElementById('print-container');
    const previewContent = document.getElementById('receipt-content-target');
    
    if (printTarget && previewContent) {
      printTarget.innerHTML = previewContent.innerHTML;
      
      // Dynamically set CSS page width for printer compatibility
      const config = loadKioskConfig();
      const printPaperWidth = config.paperWidth === '58mm' ? '58mm' : '80mm';
      let styleEl = document.getElementById('dynamic-print-page-style');
      if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-print-page-style';
        document.head.appendChild(styleEl);
      }
      styleEl.innerHTML = `@media print { @page { size: ${printPaperWidth} auto; margin: 0; } }`;
      
      // Wait for all images to load in the print DOM tree
      const images = Array.from(printTarget.querySelectorAll('img'));
      
      try {
        await Promise.all(
          images.map((img) => {
            if (img.complete) return Promise.resolve();
            return new Promise<void>((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve();
            });
          })
        );

        // Decode check
        await Promise.all(
          images.map((img) => {
            if (typeof img.decode === 'function') {
              return img.decode().catch(() => {});
            }
            return Promise.resolve();
          })
        );
      } catch (e) {
        console.warn('Error waiting for image layouts:', e);
      }

      await new Promise((resolve) => setTimeout(resolve, 300));
      
      try {
        if ((window as any).AndroidPrintBridge) {
          (window as any).AndroidPrintBridge.print();
        } else {
          window.print();
        }
      } catch (err) {
        console.warn('System print failed or was cancelled:', err);
      }
    }
  }
}

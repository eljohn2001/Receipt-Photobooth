import { BaseView } from './base';
import { audioManager } from '../services/audio';
import type { AppSession } from '../types';
import { generateReceiptEscPos } from '../services/download';
import { Capacitor, registerPlugin } from '@capacitor/core';

interface DirectPrinterPlugin {
  printRawUsb(options: { base64Data: string }): Promise<void>;
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
        <div class="printing-status-container">
          <div class="spinner spinner-accent" id="printing-spinner"></div>
          <h2 class="printing-headline">PREPARING YOUR PRINT...</h2>
          <p class="printing-subline">Please check the print window</p>
        </div>

        <!-- Virtual Printer Hardware Mock -->
        <div class="virtual-printer-box">
          <div class="printer-body">
            <div class="printer-slot-opening"></div>
            
            <!-- Paper rolls up out of the slot -->
            <div class="printed-paper-delivery">
              <div class="thermal-paper" id="delivery-paper-content" style="transform: translateY(100%);">
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
    
    // 1. Reset visual elements and animation classes
    if (deliveryContent) {
      deliveryContent.classList.remove('printed-paper-animation');
      deliveryContent.style.transform = 'translateY(100%)';
    }
    if (proceedContainer) proceedContainer.classList.add('hidden');
    if (printingSpinner) printingSpinner.classList.remove('hidden');
    if (headlineEl) headlineEl.textContent = 'PREPARING YOUR PRINT...';
    if (sublineEl) sublineEl.textContent = 'Please check the print window';
    if (hintBoxEl) {
      hintBoxEl.innerHTML = '<p>Please complete the system print dialog.</p>';
    }

    // Wait for the background QR code upload to complete if active, to ensure the correct QR code is printed
    if (this.activeSession.uploadPromise) {
      if (headlineEl) headlineEl.textContent = 'GENERATING QR CODE...';
      if (sublineEl) sublineEl.textContent = 'Connecting to cloud storage...';
      try {
        await this.activeSession.uploadPromise;
      } catch (err) {
        console.error('Failed to resolve uploadPromise during printing:', err);
      }
      // Restore headline/subline
      if (headlineEl) headlineEl.textContent = 'PREPARING YOUR PRINT...';
      if (sublineEl) sublineEl.textContent = 'Please check the print window';
    }

    if (deliveryContent && previewContent) {
      // Inject receipt HTML content into the delivery paper
      deliveryContent.innerHTML = previewContent.innerHTML;
    }

    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      // Auto-save original captured photos to device gallery silently in the background
      (async () => {
        try {
          const photos = this.activeSession.capturedPhotos || [];
          console.log(`Auto-saving ${photos.length} captured photos to gallery...`);
          for (const photo of photos) {
            const cleanBase64 = photo.replace(/^data:image\/[a-z]+;base64,/, '');
            await DirectPrinter.savePhotoToGallery({ base64Data: cleanBase64 });
          }
          console.log('Finished saving photos to gallery.');
        } catch (err) {
          console.error('Error auto-saving photos to gallery:', err);
        }
      })();

      const copies = this.activeSession.copiesCount || 1;
      try {
        for (let i = 0; i < copies; i++) {
          if (headlineEl) {
            headlineEl.textContent = copies > 1 
              ? `GENERATING COPY ${i + 1} OF ${copies}...`
              : 'GENERATING PRINT DATA...';
          }
          audioManager.playDispenser();
          
          const escPosBytes = await generateReceiptEscPos(this.activeSession);
          
          let binaryString = '';
          const len = escPosBytes.byteLength;
          for (let j = 0; j < len; j++) {
            binaryString += String.fromCharCode(escPosBytes[j]);
          }
          const base64Data = btoa(binaryString);
          
          if (headlineEl) {
            headlineEl.textContent = copies > 1
              ? `SENDING COPY ${i + 1} OF ${copies}...`
              : 'SENDING TO USB PRINTER...';
          }
          
          await DirectPrinter.printRawUsb({ base64Data });
          
          audioManager.stopDispenser();
          if (i < copies - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }
      } catch (e: any) {
        console.error('Direct USB print failed:', e);
        alert('Direct USB print failed: ' + (e.message || e));
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
            await new Promise((resolve) => setTimeout(resolve, 800));
          }
        }
      } catch (e) {
        console.error('Error during printing loop:', e);
      }
    }

    // --- Print loop is finished ---
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

    const AUTO_TRANSITION_TIME = 5000; // 5 seconds (matches receipt-eject CSS animation duration)
    
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

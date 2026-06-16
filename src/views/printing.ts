import { BaseView } from './base';
import { audioManager } from '../services/audio';
import type { AppSession } from '../types';

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
          <div class="spinner spinner-accent"></div>
          <h2 class="printing-headline">PRINTING YOUR MEMORY...</h2>
          <p class="printing-subline">Do not touch the printer slot</p>
        </div>

        <!-- Virtual Printer Hardware Mock -->
        <div class="virtual-printer-box">
          <div class="printer-body">
            <div class="printer-slot-opening"></div>
            
            <!-- Paper rolls up out of the slot -->
            <div class="printed-paper-delivery">
              <div class="thermal-paper printed-paper-animation" id="delivery-paper-content">
                <!-- Injected dynamically on enter -->
              </div>
            </div>
          </div>
        </div>
        
        <div class="printing-footer-hint">
          <p>Please tear carefully when paper stops feeding.</p>
        </div>
      </div>
    `;
  }

  unmount(): void {
    audioManager.stopDispenser();
    if (this.transitionTimeoutId !== null) {
      window.clearTimeout(this.transitionTimeoutId);
      this.transitionTimeoutId = null;
    }
  }

  async onEnter(): Promise<void> {
    const deliveryContent = this.element.querySelector('#delivery-paper-content');
    const previewContent = document.getElementById('receipt-content-target');
    
    if (deliveryContent && previewContent) {
      // Inject receipt HTML content into the delivery paper
      deliveryContent.innerHTML = previewContent.innerHTML;
    }

    const copies = this.activeSession.copiesCount || 1;
    const headlineEl = this.element.querySelector('.printing-headline');

    try {
      for (let i = 0; i < copies; i++) {
        if (headlineEl) {
          headlineEl.textContent = copies > 1 
            ? `PRINTING COPY ${i + 1} OF ${copies}...`
            : 'PRINTING YOUR MEMORY...';
        }

        // 1. Play synthesized thermal print whirr
        audioManager.playDispenser();

        // 2. Trigger actual browser print dialog
        await this.triggerWindowPrint();

        // 3. Stop whirr
        audioManager.stopDispenser();

        // 4. Brief delay between copies
        if (i < copies - 1) {
          await new Promise((resolve) => setTimeout(resolve, 800));
        }
      }
    } catch (e) {
      console.error('Error during printing loop:', e);
    }

    // Auto-transition to finished view after all copies are done
    this.transitionTimeoutId = window.setTimeout(() => {
      this.navigateTo('finished');
    }, 1000);
  }

  onLeave(): void {
    audioManager.stopDispenser();
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
      
      // Wait for all base64 images to be fully loaded in the print DOM tree
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

        // Wait for image frames to be decoded and rendered by browser thread
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

      // Small delay to ensure CSS styles and layouts have settled in print container
      await new Promise((resolve) => setTimeout(resolve, 300));
      
      try {
        window.print();
      } catch (err) {
        console.warn('System print failed or was cancelled:', err);
      }
    }
  }
}

import { BaseView } from './base';
import { loadKioskConfig } from '../services/config';

export class IdleView extends BaseView {
  private clickHandler: ((e: MouseEvent) => void) | null = null;

  mount(): void {
    this.element.innerHTML = `
      <div class="idle-screen-content">
        <!-- Dynamic isolated background media (photo/video) container -->
        <div class="idle-background-media-container" id="idle-bg-container"></div>

        <div class="attract-logo-container">
          <!-- Populated dynamically by updateBranding -->
        </div>

        <!-- Simulated 3D Printer Slot with looping print animation -->
        <div class="printer-attract-hardware">
          <!-- Sleek black 3D bevel slot mouth -->
          <div class="printer-hardware-mouth">
            <div class="printer-hardware-slot"></div>
          </div>
          
          <!-- Receipt paper delivery feed -->
          <div class="printer-paper-clipper">
            <div class="attract-loop-receipt">
              <div class="orange-tear-line"></div>
              
              <div class="receipt-brand-label">RECEIPT</div>
              
              <div class="receipt-abstract-divider">.............................</div>
              
              <!-- Printed photo paper mockup -->
              <div class="receipt-photo-frame">
                <div class="receipt-halftone-photo">
                  <div class="photo-emoji">👥✨</div>
                </div>
                <div class="photo-caption">♥ VINTAGE MEMORY ♥</div>
              </div>
              
              <div class="receipt-abstract-divider">.............................</div>
              
              <div class="receipt-abstract-total">
                <span class="total-label">Total</span>
                <span class="total-symbol">$</span>
              </div>
              
              <div class="receipt-abstract-double-divider"></div>
              
              <div class="receipt-abstract-divider">.............................</div>
              
              <!-- Integrated tactile prompt inside paper -->
              <div class="receipt-start-prompt">
                TAP TO START
              </div>
              
              <!-- Jagged receipt tear bottom -->
              <div class="receipt-jagged-edge"></div>
            </div>
          </div>
        </div>

        <!-- Footer showing powered by blcklabs -->
        <div class="idle-footer">
          powered by blcklabs
        </div>
      </div>
    `;

    this.updateBranding();

    this.clickHandler = (e: MouseEvent) => {
      // Don't navigate to template selection if they click/tap on the logo/admin area
      const target = e.target as HTMLElement;
      if (target.closest('.attract-logo-container')) {
        return;
      }
      this.navigateTo('template-selection');
    };

    // Make the entire screen tap-to-start for kiosk convenience, but focus action on CTA
    this.element.addEventListener('click', this.clickHandler);

    // Setup triple-tap listener on logo container
    const logoContainer = this.element.querySelector('.attract-logo-container');
    if (logoContainer) {
      let lastTap = 0;
      let tapCount = 0;
      logoContainer.addEventListener('click', (e) => {
        e.stopPropagation(); // Avoid triggering clickHandler
        const now = Date.now();
        if (now - lastTap < 400) {
          tapCount++;
        } else {
          tapCount = 1;
        }
        lastTap = now;
        if (tapCount === 3) {
          tapCount = 0;
          const adminModal = document.getElementById('admin-modal');
          if (adminModal) {
            adminModal.classList.remove('hidden');
            adminModal.dispatchEvent(new CustomEvent('open-admin'));
          }
        }
      });
    }
  }

  updateBranding(): void {
    const config = loadKioskConfig();
    const container = this.element.querySelector('.attract-logo-container');
    if (container) {
      if (config.logoDataUrl) {
        container.innerHTML = `
          <img class="attract-cafe-logo" src="${config.logoDataUrl}" alt="${config.cafeName}" />
        `;
      } else {
        container.innerHTML = `
          <h1 class="brand-title">${config.cafeName}</h1>
        `;
      }
    }
  }

  unmount(): void {
    if (this.clickHandler) {
      this.element.removeEventListener('click', this.clickHandler);
    }
  }

  async onEnter(): Promise<void> {
    this.updateBranding();
    
    // Dynamically re-trigger applying background photo/video on enter
    if (typeof (window as any).applyKioskTheme === 'function') {
      await (window as any).applyKioskTheme();
    }

    const receipt = this.element.querySelector('.attract-loop-receipt') as HTMLElement;
    if (receipt) {
      receipt.classList.add('animate-print');
    }
  }

  onLeave(): void {
    const receipt = this.element.querySelector('.attract-loop-receipt') as HTMLElement;
    if (receipt) {
      receipt.classList.remove('animate-print');
    }
  }
}

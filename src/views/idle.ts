import { BaseView } from './base';
import { loadKioskConfig } from '../services/config';
import { audioManager } from '../services/audio';

export class IdleView extends BaseView {
  private clickHandler: ((e: MouseEvent) => void) | null = null;

  mount(): void {
    this.element.innerHTML = `
      <div class="idle-screen-content">
        <!-- Hidden hotspot for admin panel -->
        <div class="admin-hotspot" id="admin-hotspot"></div>

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
              <div class="receipt-elegant-prompt">
                <span>Tap to</span>
                <span>Start</span>
              </div>
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

    let isTransitioning = false;
    this.clickHandler = (e: MouseEvent) => {
      if (isTransitioning) return;
      // Don't navigate to template selection if they click/tap on the logo/admin area or administrative hotspot
      const target = e.target as HTMLElement;
      if (target.closest('.attract-logo-container') || target.closest('#admin-hotspot')) {
        return;
      }
      isTransitioning = true;

      const receipt = this.element.querySelector('.attract-loop-receipt') as HTMLElement;
      if (receipt) {
        receipt.classList.remove('animate-print');
        void receipt.offsetWidth; // Force reflow
        receipt.classList.add('tear-off');
      }

      // Play mechanical sound
      audioManager.playPaperTear();

      setTimeout(() => {
        isTransitioning = false;
        const config = loadKioskConfig();
        if (config.enableComfortCards !== false) {
          this.navigateTo('mode-selection');
        } else {
          this.navigateTo('template-selection');
        }
      }, 400);
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
          const config = loadKioskConfig();
          const expectedPin = config.adminPin || '1234';
          const pin = prompt('Enter Admin PIN to access configuration:');
          if (pin === expectedPin) {
            const adminModal = document.getElementById('admin-modal');
            if (adminModal) {
              adminModal.classList.remove('hidden');
              adminModal.dispatchEvent(new CustomEvent('open-admin'));
            }
          } else if (pin !== null) {
            alert('Incorrect PIN!');
          }
        }
      });
    }

    // Setup triple-tap listener on administrative hotspot
    const adminHotspot = this.element.querySelector('#admin-hotspot');
    if (adminHotspot) {
      let lastTap = 0;
      let tapCount = 0;
      adminHotspot.addEventListener('click', (e) => {
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
          const config = loadKioskConfig();
          const expectedPin = config.adminPin || '1234';
          const pin = prompt('Enter Admin PIN to access configuration:');
          if (pin === expectedPin) {
            const adminModal = document.getElementById('admin-modal');
            if (adminModal) {
              adminModal.classList.remove('hidden');
              adminModal.dispatchEvent(new CustomEvent('open-admin'));
            }
          } else if (pin !== null) {
            alert('Incorrect PIN!');
          }
        }
      });
    }
  }

  updateBranding(): void {
    const config = loadKioskConfig();
    const container = this.element.querySelector('.attract-logo-container');
    if (container) {
      const topBadgeText = config.homeSubtitleTop || '';
      const subtitleText = config.homeSubtitleBottom || '';
      
      const topBadge = topBadgeText ? `<div class="attract-top-subtitle">${topBadgeText}</div>` : '';
      const subtitle = subtitleText ? `<p class="brand-subtitle">${subtitleText}</p>` : '';

      if (config.logoDataUrl) {
        container.innerHTML = `
          ${topBadge}
          <div class="logo-image-wrapper">
            <img class="attract-cafe-logo" src="${config.logoDataUrl}" alt="${config.cafeName}" />
          </div>
          ${subtitle}
        `;
      } else {
        container.innerHTML = `
          ${topBadge}
          <h1 class="brand-title">${config.cafeName}</h1>
          ${subtitle}
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
      receipt.classList.remove('tear-off');
      void receipt.offsetWidth; // Force reflow
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

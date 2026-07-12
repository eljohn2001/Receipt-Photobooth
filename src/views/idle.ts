import { BaseView } from './base';
import { loadKioskConfig } from '../services/config';
import type { KioskConfig } from '../services/config';
import { audioManager } from '../services/audio';

export class IdleView extends BaseView {
  private clickHandler: ((e: MouseEvent) => void) | null = null;
  private currentMode: 'graphic' | 'layout' | 'curtain' | null = null;

  mount(): void {
    const config = loadKioskConfig();
    const mode = config.homeScreenMode || 'graphic';
    this.currentMode = mode;

    const globalCurtain = document.getElementById('global-curtain-container');

    if (mode === 'curtain') {
      this.element.innerHTML = `
        <div class="idle-screen-content curtain-mode">
          <!-- Hidden hotspot for admin panel -->
          <div class="admin-hotspot" id="admin-hotspot"></div>

          <!-- Dynamic background media container behind the curtains -->
          <div class="idle-background-media-container" id="idle-bg-container"></div>
        </div>
      `;

      if (globalCurtain) {
        globalCurtain.classList.remove('hidden');
        globalCurtain.classList.remove('curtains-parted');
        const overlayPanel = globalCurtain.querySelector('#curtain-overlay-panel');
        if (overlayPanel) {
          overlayPanel.classList.remove('hidden');
          (overlayPanel as HTMLElement).style.opacity = '1';
        }
      }

      let isTransitioning = false;
      this.clickHandler = (e: MouseEvent) => {
        if (!this.element.classList.contains('active-slide')) return;
        if (isTransitioning) return;
        const target = e.target as HTMLElement;
        if (
          target.closest('.file-uploader-box') ||
          target.closest('#admin-hotspot') ||
          target.closest('#admin-curtain-hotspot')
        ) {
          return;
        }
        isTransitioning = true;

        if (globalCurtain) {
          globalCurtain.classList.add('curtains-parted');
        }

        // Trigger zoom-in animation on the next screen content
        document.getElementById('app')?.classList.add('curtain-revealing');

        // Play mechanical sound
        audioManager.playPaperTear();

        // Load fresh config dynamically to check if comfort cards are enabled
        const freshConfig = loadKioskConfig();
        const nextState = freshConfig.enableComfortCards !== false ? 'mode-selection' : 'template-selection';
        this.navigateTo(nextState);

        setTimeout(() => {
          if (globalCurtain) {
            globalCurtain.classList.add('hidden');
          }
          document.getElementById('app')?.classList.remove('curtain-revealing');
          isTransitioning = false;
        }, 1200); // 1.2s curtain transition duration
      };

      if (globalCurtain) {
        globalCurtain.addEventListener('click', this.clickHandler);
      }

      // Setup triple-tap listener on curtains admin hotspot
      const curtainHotspot = document.getElementById('admin-curtain-hotspot');
      if (curtainHotspot) {
        let lastTap = 0;
        let tapCount = 0;
        curtainHotspot.addEventListener('click', (e) => {
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
            this.triggerAdminModal();
          }
        });
      }
    } else {
      if (globalCurtain) {
        globalCurtain.classList.add('hidden');
      }

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

      let isTransitioning = false;
      this.clickHandler = (e: MouseEvent) => {
        if (isTransitioning) return;
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

      // Make the entire screen tap-to-start for kiosk convenience
      this.element.addEventListener('click', this.clickHandler);

      // Setup triple-tap listener on logo container (only present in logo layout)
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
            this.triggerAdminModal();
          }
        });
      }
    }

    // Setup triple-tap listener on administrative hotspot (always present)
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
          this.triggerAdminModal();
        }
      });
    }
  }

  private triggerAdminModal(): void {
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

  updateBranding(): void {
    const config = loadKioskConfig();
    const mode = config.homeScreenMode || 'graphic';
    
    if (mode !== this.currentMode) {
      this.unmount();
      this.mount();
      return;
    }

    this.updateBrandingInternal(config, mode);
  }

  private updateBrandingInternal(config: KioskConfig, mode: 'graphic' | 'layout' | 'curtain'): void {
    if (mode === 'curtain') {
      const container = document.getElementById('curtain-overlay-panel');
      if (container) {
        if (config.curtainOverlayDataUrl) {
          container.innerHTML = `
            <div class="curtain-custom-graphic">
              <img src="${config.curtainOverlayDataUrl}" alt="Overlay Graphic" />
            </div>
          `;
        } else {
          container.innerHTML = '';
        }
      }
    } else {
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
  }

  unmount(): void {
    const globalCurtain = document.getElementById('global-curtain-container');
    if (this.clickHandler) {
      if (globalCurtain) {
        globalCurtain.removeEventListener('click', this.clickHandler);
      }
      this.element.removeEventListener('click', this.clickHandler);
      this.clickHandler = null;
    }
  }

  async onEnter(): Promise<void> {
    this.updateBranding();
    
    const config = loadKioskConfig();
    const mode = config.homeScreenMode || 'graphic';
    const globalCurtain = document.getElementById('global-curtain-container');

    if (mode === 'curtain' && globalCurtain) {
      globalCurtain.classList.remove('hidden');
      globalCurtain.classList.remove('curtains-parted');
      const overlayPanel = globalCurtain.querySelector('#curtain-overlay-panel');
      if (overlayPanel) {
        overlayPanel.classList.remove('hidden');
        (overlayPanel as HTMLElement).style.opacity = '1';
      }
    }
    
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

import { BaseView } from './base';
import type { AppSession, PrintPackage } from '../types';
import { loadKioskConfig } from '../services/config';
import { hapticService } from '../services/haptics';
import { audioManager } from '../services/audio';

export class PackageSelectionView extends BaseView {
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
      <div class="template-screen-content">
        <div class="template-screen-header">
          <button class="btn-back" id="btn-pkg-back">← BACK</button>
          <h2 class="template-choose-title">CHOOSE A <span class="script-title">Package</span></h2>
          <p style="margin-top: 8px; font-size: 16px; color: var(--text-secondary);">Select the number of prints for your receipt photo strip.</p>
        </div>

        <div class="packages-grid-wrapper">
          <div class="packages-list-grid" id="packages-list-grid">
            <!-- Rendered dynamically -->
          </div>
        </div>
      </div>
    `;

    this.setupEvents();
  }

  unmount(): void {}

  onEnter(): void {
    this.renderPackages();

    // Animate header entrance
    const header = this.element.querySelector('.template-screen-header') as HTMLElement;
    if (header) { 
      header.classList.remove('header-animate-in'); 
      void header.offsetHeight; 
      header.classList.add('header-animate-in'); 
    }

    // Staggered card entrance + breathing
    const cards = this.element.querySelectorAll('.package-card-option');
    cards.forEach((card) => {
      card.classList.remove('card-stagger-enter', 'card-breathing');
      (card as HTMLElement).style.opacity = '';
      void (card as HTMLElement).offsetHeight;
      card.classList.add('card-stagger-enter');
    });

    setTimeout(() => {
      cards.forEach(card => {
        card.classList.remove('card-stagger-enter');
        card.classList.add('card-breathing');
      });
    }, 700);

    // Clean up any leftover hero elements
    this.element.querySelectorAll('.hero-zoom-overlay, .hero-card-clone').forEach(el => el.remove());
  }

  private setupEvents(): void {
    const backBtn = this.element.querySelector('#btn-pkg-back');
    backBtn?.addEventListener('click', () => {
      audioManager.playBeep();
      this.navigateTo('template-selection');
    });
  }

  private createRipple(container: HTMLElement, e: MouseEvent | TouchEvent): void {
    const rect = container.getBoundingClientRect();
    let x: number, y: number;
    if ('touches' in e) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = e.clientX - rect.left;
      y = e.clientY - rect.top;
    }
    const ripple = document.createElement('div');
    ripple.className = 'ripple-wave';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    container.appendChild(ripple);
    setTimeout(() => ripple.remove(), 700);
  }

  private heroZoomSelect(card: HTMLElement, name: string, onComplete: () => void): void {
    const screenContent = this.element.querySelector('.template-screen-content') as HTMLElement;
    if (!screenContent) return;

    // Stop breathing
    this.element.querySelectorAll('.card-breathing').forEach(el => el.classList.remove('card-breathing'));

    // Fade out all other cards
    const allCards = this.element.querySelectorAll('.package-card-option');
    allCards.forEach(c => {
      if (c !== card) {
        (c as HTMLElement).style.transition = 'opacity 0.4s ease, filter 0.4s ease, transform 0.5s cubic-bezier(0.16, 1, 0.3, 1)';
        (c as HTMLElement).style.opacity = '0';
        (c as HTMLElement).style.filter = 'blur(8px)';
        (c as HTMLElement).style.transform = 'scale(0.8)';
      }
    });

    // Create blur overlay with confirmation
    const overlay = document.createElement('div');
    overlay.className = 'hero-zoom-overlay';
    overlay.innerHTML = `
      <div class="hero-confirmation-check">
        <svg viewBox="0 0 52 52" class="confirmation-svg">
          <circle cx="26" cy="26" r="25" fill="none" class="circle-path" />
          <path fill="none" class="check-path" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
        </svg>
      </div>
      <div class="hero-confirmation-label">${name}</div>
    `;
    screenContent.appendChild(overlay);

    // Clone the selected card and animate to center
    const cardRect = card.getBoundingClientRect();
    const screenRect = screenContent.getBoundingClientRect();
    const clone = card.cloneNode(true) as HTMLElement;
    clone.classList.add('hero-card-clone');
    clone.style.top = (cardRect.top - screenRect.top) + 'px';
    clone.style.left = (cardRect.left - screenRect.left) + 'px';
    clone.style.width = cardRect.width + 'px';
    clone.style.height = cardRect.height + 'px';
    screenContent.appendChild(clone);

    // Force layout reflow to register starting positions before animating
    void clone.offsetHeight;

    requestAnimationFrame(() => {
      overlay.classList.add('active');
      clone.classList.add('centered');
    });

    setTimeout(() => {
      clone.classList.add('exiting');
      overlay.style.transition = 'opacity 0.3s ease';
      overlay.style.opacity = '0';

      setTimeout(() => {
        onComplete();
        overlay.remove();
        clone.remove();
        // Reset card styles
        allCards.forEach(c => {
          (c as HTMLElement).style.opacity = '';
          (c as HTMLElement).style.filter = '';
          (c as HTMLElement).style.transform = '';
          (c as HTMLElement).style.transition = '';
        });
      }, 350);
    }, 900);
  }

  private renderPackages(): void {
    const gridContainer = this.element.querySelector('#packages-list-grid');
    if (!gridContainer) return;

    const config = loadKioskConfig();
    const currency = config.currencySymbol || '₱';

    // Get enabled packages, fallback if empty
    let pkgs: PrintPackage[] = (config.packages || []).filter(p => p.isEnabled);
    if (pkgs.length === 0) {
      pkgs = [
        { id: 'pkg-1', name: '1 Print', printsCount: 1, price: 30, isEnabled: true },
        { id: 'pkg-2', name: '2 Prints', printsCount: 2, price: 40, isEnabled: true },
        { id: 'pkg-3', name: '3 Prints', printsCount: 3, price: 50, isEnabled: true },
        { id: 'pkg-4', name: '4 Prints', printsCount: 4, price: 60, isEnabled: true }
      ];
    }

    gridContainer.innerHTML = pkgs.map((pkg) => {
      const formattedPrice = `${currency}${pkg.price.toFixed(2)}`;
      return `
        <div class="package-card-option ripple-container" data-pkg-id="${pkg.id}">
          <div class="package-card-icon">🖨️</div>
          <h3 class="package-card-title">${pkg.name}</h3>
          <p class="package-card-desc">Prints ${pkg.printsCount} photo strip copies</p>
          <div class="package-card-price">${formattedPrice}</div>
        </div>
      `;
    }).join('');

    // Wire up clicks with ripple + hero zoom
    const cards = this.element.querySelectorAll('.package-card-option');
    cards.forEach((card) => {
      card.classList.add('tilt-card');

      card.addEventListener('mousemove', (e: any) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const tiltX = ((y - centerY) / centerY) * -10;
        const tiltY = ((x - centerX) / centerX) * 10;
        (card as HTMLElement).style.setProperty('--tilt-x', `${tiltX}deg`);
        (card as HTMLElement).style.setProperty('--tilt-y', `${tiltY}deg`);
      });

      card.addEventListener('mouseleave', () => {
        (card as HTMLElement).style.setProperty('--tilt-x', '0deg');
        (card as HTMLElement).style.setProperty('--tilt-y', '0deg');
      });

      card.addEventListener('touchmove', (e: any) => {
        const touch = e.touches[0];
        const rect = card.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const tiltX = ((y - centerY) / centerY) * -10;
        const tiltY = ((x - centerX) / centerX) * 10;
        (card as HTMLElement).style.setProperty('--tilt-x', `${tiltX}deg`);
        (card as HTMLElement).style.setProperty('--tilt-y', `${tiltY}deg`);
      });

      card.addEventListener('touchend', () => {
        (card as HTMLElement).style.setProperty('--tilt-x', '0deg');
        (card as HTMLElement).style.setProperty('--tilt-y', '0deg');
      });

      card.addEventListener('click', (e) => {
        const pkgId = card.getAttribute('data-pkg-id');
        const selected = pkgs.find(p => p.id === pkgId);
        if (selected) {
          audioManager.playBeep();
          hapticService.impactMedium();

          // Create ripple effect
          this.createRipple(card as HTMLElement, e as MouseEvent);

          // Check if paper prints remaining is insufficient
          const config = loadKioskConfig();
          const paperRemaining = config.paperPrintsRemaining !== undefined ? config.paperPrintsRemaining : 150;
          
          if (selected.printsCount > paperRemaining) {
            alert(`⚠️ Paper Roll Low: This kiosk only has ${paperRemaining} prints remaining. Please choose a package with ${paperRemaining} or fewer prints, or notify the café staff to refill the paper.`);
            return;
          }

          this.activeSession.selectedPackage = selected;

          // Hero zoom selection animation
          this.heroZoomSelect(card as HTMLElement, `${selected.name} Selected`, () => {
            this.navigateTo('order-summary');
          });
        }
      });
    });
  }


}


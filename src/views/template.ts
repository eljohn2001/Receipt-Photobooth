import { BaseView } from './base';
import { TEMPLATES } from '../templates';
import type { AppSession } from '../types';
import { hapticService } from '../services/haptics';
import { loadKioskConfig } from '../services/config';
import { audioManager } from '../services/audio';

import template1 from '../assets/template 1.png';
import template2 from '../assets/template 2.png';
import template3 from '../assets/template 3.png';
import template4 from '../assets/template 4.png';

export class TemplateView extends BaseView {
  private currentSession: AppSession;

  constructor(
    element: HTMLElement,
    navigateTo: (state: any, params?: any) => void,
    session: AppSession
  ) {
    super(element, navigateTo);
    this.currentSession = session;
  }

  mount(): void {
    this.element.innerHTML = `
      <div class="template-screen-content">
        <div class="template-screen-header">
          <h2 class="template-choose-title">CHOOSE A <span class="script-title">Layout</span></h2>
        </div>

        <!-- Static 2x2 Grid Layout for the 4 Mockup Cards -->
        <div class="templates-grid-wrapper">
          <div class="templates-static-grid">
            <!-- Populated dynamically by renderTemplatesGrid in onEnter -->
          </div>
        </div>

        <div class="template-screen-footer">
          <div class="swipe-back-track" id="swipe-back-tmpl">
            <span class="swipe-back-label" id="swipe-back-tmpl-label">← SWIPE TO GO BACK</span>
            <div class="swipe-back-thumb hint" id="swipe-back-tmpl-thumb">
              <svg viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/></svg>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupEvents();
  }

  unmount(): void {}

  onEnter(): void {
    this.renderTemplatesGrid();
    const label = this.element.querySelector('#swipe-back-tmpl-label');
    if (label) {
      const config = loadKioskConfig();
      if (config.enableComfortCards !== false) {
        label.textContent = '← SWIPE TO GO BACK';
      } else {
        label.textContent = '← SWIPE TO GO BACK';
      }
    }
    // Reset thumb position
    const thumb = this.element.querySelector('#swipe-back-tmpl-thumb') as HTMLElement;
    if (thumb) {
      thumb.style.left = '5px';
      thumb.classList.add('hint');
    }
    const track = this.element.querySelector('#swipe-back-tmpl') as HTMLElement;
    if (track) track.classList.remove('swiped');

    // Animate header and footer entrance
    const header = this.element.querySelector('.template-screen-header') as HTMLElement;
    const footer = this.element.querySelector('.template-screen-footer') as HTMLElement;
    if (header) { header.classList.remove('header-animate-in'); void header.offsetHeight; header.classList.add('header-animate-in'); }
    if (footer) { footer.classList.remove('footer-animate-in'); void footer.offsetHeight; footer.classList.add('footer-animate-in'); }

    // Staggered card entrance + breathing
    const items = this.element.querySelectorAll('.template-selection-item');
    items.forEach((item) => {
      item.classList.remove('card-stagger-enter', 'card-breathing');
      (item as HTMLElement).style.opacity = '';
      void (item as HTMLElement).offsetHeight;
      item.classList.add('card-stagger-enter');
    });

    // Add breathing after entrance finishes
    setTimeout(() => {
      items.forEach(item => {
        item.classList.remove('card-stagger-enter');
        item.classList.add('card-breathing');
      });
    }, 700);

    // Clean up any leftover hero overlay
    this.element.querySelectorAll('.hero-zoom-overlay, .hero-card-clone').forEach(el => el.remove());
  }

  private setupEvents(): void {
    // Swipe-to-go-back interaction
    this.setupSwipeBack('swipe-back-tmpl', () => {
      const config = loadKioskConfig();
      if (config.enableComfortCards !== false) {
        this.navigateTo('mode-selection');
      } else {
        this.navigateTo('idle');
      }
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

  private heroZoomSelect(card: HTMLElement, item: HTMLElement, gridContainer: Element, name: string): void {
    const screenContent = this.element.querySelector('.template-screen-content') as HTMLElement;
    if (!screenContent) return;

    // Stop breathing
    this.element.querySelectorAll('.card-breathing').forEach(el => el.classList.remove('card-breathing'));

    // Add selection state to grid (fades out other cards)
    gridContainer.classList.add('has-selection');
    item.classList.add('selected-item');

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

    // Trigger animations after a frame
    requestAnimationFrame(() => {
      overlay.classList.add('active');
      clone.classList.add('centered');
    });

    // Exit animation then navigate
    setTimeout(() => {
      clone.classList.add('exiting');
      overlay.style.transition = 'opacity 0.3s ease';
      overlay.style.opacity = '0';

      setTimeout(() => {
        this.navigateTo('package-selection');
        // Clean up
        overlay.remove();
        clone.remove();
        gridContainer.classList.remove('has-selection');
        item.classList.remove('selected-item');
      }, 350);
    }, 900);
  }

  private setupSwipeBack(trackId: string, onComplete: () => void): void {
    const track = this.element.querySelector(`#${trackId}`) as HTMLElement;
    const thumb = this.element.querySelector(`#${trackId}-thumb`) as HTMLElement;
    if (!track || !thumb) return;

    let isDragging = false;
    let startX = 0;
    let thumbStart = 5;
    const maxLeft = () => track.clientWidth - thumb.clientWidth - 10;

    const onStart = (clientX: number) => {
      isDragging = true;
      startX = clientX;
      thumbStart = parseInt(thumb.style.left || '5', 10);
      thumb.classList.remove('hint');
      thumb.style.transition = 'none';
    };

    const onMove = (clientX: number) => {
      if (!isDragging) return;
      const dx = clientX - startX;
      const newLeft = Math.max(5, Math.min(thumbStart + dx, maxLeft()));
      thumb.style.left = newLeft + 'px';
    };

    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      thumb.style.transition = 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1)';

      const currentLeft = parseInt(thumb.style.left || '5', 10);
      const progress = currentLeft / maxLeft();

      if (progress > 0.6) {
        // Swipe completed
        thumb.style.left = maxLeft() + 'px';
        track.classList.add('swiped');
        audioManager.playBeep();
        setTimeout(() => onComplete(), 250);
      } else {
        // Snap back
        thumb.style.left = '5px';
        setTimeout(() => thumb.classList.add('hint'), 400);
      }
    };

    // Touch events
    track.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      const thumbRect = thumb.getBoundingClientRect();
      const touchInThumb = touch.clientX >= thumbRect.left - 10 && touch.clientX <= thumbRect.right + 10
                        && touch.clientY >= thumbRect.top - 10 && touch.clientY <= thumbRect.bottom + 10;
      if (touchInThumb) onStart(touch.clientX);
    }, { passive: true });

    track.addEventListener('touchmove', (e) => {
      if (isDragging) onMove(e.touches[0].clientX);
    }, { passive: true });

    track.addEventListener('touchend', () => onEnd());
    track.addEventListener('touchcancel', () => onEnd());

    // Mouse events (for desktop testing)
    track.addEventListener('mousedown', (e) => {
      const thumbRect = thumb.getBoundingClientRect();
      const inThumb = e.clientX >= thumbRect.left - 10 && e.clientX <= thumbRect.right + 10;
      if (inThumb) onStart(e.clientX);
    });

    document.addEventListener('mousemove', (e) => {
      if (isDragging) onMove(e.clientX);
    });

    document.addEventListener('mouseup', () => onEnd());
  }

  private renderTemplatesGrid(): void {
    const gridContainer = this.element.querySelector('.templates-static-grid');
    if (!gridContainer) return;

    const config = loadKioskConfig();

    gridContainer.innerHTML = TEMPLATES.map((tmpl) => `
      <div class="template-selection-item">
        <div class="template-card-mockup-png-wrapper" data-template-id="${tmpl.id}">
          <img class="template-mockup-png-bg" src="${this.getMockupImgSrc(tmpl.id)}" alt="${tmpl.name}" />
          <div class="template-card-logo-overlay">
            ${this.renderOverlayLogo(config)}
          </div>
        </div>
        <h3 class="template-mockup-name">${tmpl.name}</h3>
      </div>
    `).join('');

    // Wire up card clicks
    const items = this.element.querySelectorAll('.template-selection-item');

    items.forEach((item) => {
      const card = item.querySelector('.template-card-mockup-png-wrapper') as HTMLElement;
      if (!card) return;

      // Add ripple container class
      card.classList.add('ripple-container');
      card.classList.add('tilt-card');

      card.addEventListener('mousemove', (e: any) => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const tiltX = ((y - centerY) / centerY) * -10; // Max tilt 10deg
        const tiltY = ((x - centerX) / centerX) * 10;
        card.style.setProperty('--tilt-x', `${tiltX}deg`);
        card.style.setProperty('--tilt-y', `${tiltY}deg`);
      });

      card.addEventListener('mouseleave', () => {
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
      });

      // Touch equivalent
      card.addEventListener('touchmove', (e: any) => {
        const touch = e.touches[0];
        const rect = card.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const tiltX = ((y - centerY) / centerY) * -10;
        const tiltY = ((x - centerX) / centerX) * 10;
        card.style.setProperty('--tilt-x', `${tiltX}deg`);
        card.style.setProperty('--tilt-y', `${tiltY}deg`);
      });

      card.addEventListener('touchend', () => {
        card.style.setProperty('--tilt-x', '0deg');
        card.style.setProperty('--tilt-y', '0deg');
      });

      card.addEventListener('click', (e) => {
        const id = card.getAttribute('data-template-id');
        if (id) {
          audioManager.playBeep();
          hapticService.impactMedium();

          // Create ripple effect
          this.createRipple(card, e);

          // Find template name
          const tmpl = TEMPLATES.find(t => t.id === id);
          const name = tmpl?.name || id;

          this.currentSession.selectedTemplateId = id;

          // Hero zoom animation
          this.heroZoomSelect(card, item as HTMLElement, gridContainer!, name);
        }
      });
    });
  }

  private renderOverlayLogo(config: any): string {
    if (config.logoDataUrl) {
      return `<img class="overlay-cafe-logo" src="${config.logoDataUrl}" alt="${config.cafeName}" />`;
    }
    return `<span class="overlay-cafe-name">${config.cafeName}</span>`;
  }

  private getMockupImgSrc(id: string): string {
    switch (id) {
      case 'classic-solo':
        return template1;
      case 'duet-grid':
        return template2;
      case 'film-stack':
        return template3;
      case 'hex-grid':
        return template4;
      default:
        return '';
    }
  }
}

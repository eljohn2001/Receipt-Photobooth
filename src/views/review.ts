import { BaseView } from './base';
import { getTemplateById } from '../templates';
import type { AppSession } from '../types';
import { audioManager } from '../services/audio';

export class ReviewView extends BaseView {
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
    // Structure is populated dynamically in onEnter
  }

  unmount(): void {}

  onEnter(): void {
    const template = getTemplateById(this.activeSession.selectedTemplateId || '');
    if (!template || this.activeSession.capturedPhotos.length === 0) {
      console.error('Invalid review state: missing template or photos');
      this.navigateTo('template-selection');
      return;
    }

    this.element.innerHTML = `
      <div class="review-screen-content">
        <div class="template-screen-header">
          <button class="btn-back" id="btn-review-back">← CANCEL</button>
          <h2 class="template-choose-title" style="justify-content: center;">REVIEW <span class="script-title">Photos</span></h2>
          <p class="view-subtitle" style="margin-top: 6px;">Tap any photo you want to retake</p>
        </div>

        <div class="review-grid-container">
          <div class="review-grid grid-${template.photoCount}" id="review-photos-grid">
            ${this.activeSession.capturedPhotos.slice(0, template.photoCount).map((photo, i) => `
              <div class="review-photo-card animate-pop-in" data-index="${i}" style="animation-delay: ${i * 100}ms;">
                <div class="review-photo-badge">${i + 1}</div>
                <img src="${photo}" class="review-thumbnail" />
                <div class="review-card-overlay">
                  <span class="overlay-icon">🔄</span>
                  <span class="overlay-text">TAP TO RETAKE</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="review-actions-container">
          <button class="btn btn-primary btn-glow btn-wide" id="btn-review-proceed">PROCEED TO PRINT ➔</button>
        </div>
      </div>
    `;

    this.setupEvents();
  }

  private setupEvents(): void {
    // 1. Cancel / Back button
    const backBtn = this.element.querySelector('#btn-review-back');
    backBtn?.addEventListener('click', () => {
      audioManager.playBeep();
      if (confirm('Cancel this photo session and start over?')) {
        this.navigateTo('template-selection');
      }
    });

    // 2. Click a photo card to retake only that specific shot
    const cards = this.element.querySelectorAll('.review-photo-card');
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        const indexStr = (e.currentTarget as HTMLElement).getAttribute('data-index');
        if (indexStr === null) return;
        const index = parseInt(indexStr, 10);
        
        audioManager.playBeep();
        console.log(`User selected to retake photo index: ${index}`);
        this.navigateTo('camera-capture', { retakeIndex: index });
      });
    });

    // 3. Proceed button
    const proceedBtn = this.element.querySelector('#btn-review-proceed');
    proceedBtn?.addEventListener('click', () => {
      audioManager.playBeep();
      this.navigateTo('preview');
    });
  }
}

import { BaseView } from './base';
import type { AppSession } from '../types';
import { loadKioskConfig } from '../services/config';
import { audioManager } from '../services/audio';
// @ts-ignore
import comfortQuotesRaw from '../ComfortQuotes.txt?raw';
import { generateShortId } from '../services/supabase';
import { generateQRCode } from '../services/qr';
import { renderComfortCard } from '../templates/helper';
import { generateReceiptBlob } from '../services/download';
import { uploadReceiptPhotos } from '../services/upload';

export class ModeSelectionView extends BaseView {
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
      <div class="mode-selection-screen">
        <div class="template-screen-header">
          <h2 class="template-choose-title">CHOOSE AN <span class="script-title">Experience</span></h2>
        </div>

        <div class="mode-options-container">
          <!-- Photo Receipt Card -->
          <div class="mode-option-card" id="mode-option-photo">
            <div class="mode-option-icon">📸</div>
            <h3 class="mode-option-title">Photo Receipt</h3>
            <p class="mode-option-desc">Vintage photo collage.</p>
            <button class="btn btn-primary mode-option-btn" type="button">START PHOTO BOOTH</button>
          </div>

          <!-- Comfort Card Card -->
          <div class="mode-option-card" id="mode-option-comfort">
            <div class="mode-option-icon">☕</div>
            <h3 class="mode-option-title">Comfort Card</h3>
            <p class="mode-option-desc">Self-care affirmation.</p>
            <button class="btn btn-primary mode-option-btn" type="button">GET COMFORT CARD</button>
          </div>
        </div>

        <div class="template-screen-footer">
          <div class="swipe-back-track" id="swipe-back-mode">
            <span class="swipe-back-label">← SWIPE TO GO BACK</span>
            <div class="swipe-back-thumb hint" id="swipe-back-mode-thumb">
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
    const photoCard = this.element.querySelector('#mode-option-photo') as HTMLElement;
    const comfortCard = this.element.querySelector('#mode-option-comfort') as HTMLElement;
    
    photoCard?.classList.remove('selected', 'fade-out');
    comfortCard?.classList.remove('selected', 'fade-out');

    // Reset thumb position
    const thumb = this.element.querySelector('#swipe-back-mode-thumb') as HTMLElement;
    if (thumb) {
      thumb.style.left = '5px';
      thumb.classList.add('hint');
    }
    const track = this.element.querySelector('#swipe-back-mode') as HTMLElement;
    if (track) track.classList.remove('swiped');
  }

  private setupEvents(): void {
    // Swipe-to-go-back interaction
    this.setupSwipeBack('swipe-back-mode', () => {
      audioManager.playBeep();
      this.navigateTo('idle');
    });

    const photoCard = this.element.querySelector('#mode-option-photo') as HTMLElement;
    const comfortCard = this.element.querySelector('#mode-option-comfort') as HTMLElement;

    photoCard?.addEventListener('click', (e) => {
      e.stopPropagation();
      
      const config = loadKioskConfig();
      const paperRemaining = config.paperPrintsRemaining !== undefined ? config.paperPrintsRemaining : 150;
      if (paperRemaining <= 0) {
        alert("⚠️ Out of Paper: Kiosk is currently out of printing paper. Please contact café staff to refill the roll.");
        return;
      }

      audioManager.playBeep();

      // Add selection animations
      photoCard.classList.add('selected');
      comfortCard?.classList.add('fade-out');

      setTimeout(() => {
        this.navigateTo('template-selection');
      }, 400);
    });

    comfortCard?.addEventListener('click', async (e) => {
      e.stopPropagation();

      const config = loadKioskConfig();
      const paperRemaining = config.paperPrintsRemaining !== undefined ? config.paperPrintsRemaining : 150;
      if (paperRemaining <= 0) {
        alert("⚠️ Out of Paper: Kiosk is currently out of printing paper. Please contact café staff to refill the roll.");
        return;
      }

      audioManager.playBeep();

      // Add selection animations
      comfortCard.classList.add('selected');
      photoCard?.classList.add('fade-out');

      const startTime = Date.now();

      // Select random Comfort Quote and random illustration, prepare session
      await this.prepareComfortCardSession();

      // Render comfort card HTML and put it in receipt-content-target
      const contentTarget = document.getElementById('receipt-content-target');
      if (contentTarget) {
        contentTarget.innerHTML = renderComfortCard(this.activeSession, this.activeSession.metadata!);
      }

      // Ensure at least 400ms has elapsed since click to let animation play
      const elapsed = Date.now() - startTime;
      const delay = Math.max(0, 400 - elapsed);

      setTimeout(() => {
        // Proceed straight to printing state
        this.navigateTo('printing');
      }, delay);
    });
  }

  private async prepareComfortCardSession() {
    this.activeSession.selectedTemplateId = 'comfort-card';
    this.activeSession.capturedPhotos = [];
    this.activeSession.ditheredPhotos = [];
    this.activeSession.copiesCount = 1;
    this.activeSession.shareId = generateShortId(6);

    // 1. Select random quote
    let quote = "You are worthy of rest, warmth, and gentle moments.";
    try {
      const allQuotes = comfortQuotesRaw
        .split('\n')
        .map((q: string) => q.trim())
        .filter(Boolean);
      if (allQuotes.length > 0) {
        const randomIndex = Math.floor(Math.random() * allQuotes.length);
        quote = allQuotes[randomIndex];
      }
    } catch (e) {
      console.warn('Failed to load comfort quotes:', e);
    }
    this.activeSession.selectedQuote = quote;

    // 2. Select random illustration from the available pool
    const illustrations = ['coffee', 'candle', 'flower', 'star'];
    const randomIllIndex = Math.floor(Math.random() * illustrations.length);
    this.activeSession.selectedIllustration = illustrations[randomIllIndex];

    // 3. Build metadata
    const config = loadKioskConfig();
    const now = new Date();
    const timestampString = now.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    // 4. Generate initial QR code pointing to digital share page
    const baseUrl = 'https://photoreceipt.stoodioph.com';
    const digitalUrl = `${baseUrl}/?id=${this.activeSession.shareId}`;
    const qrDataUrl = await generateQRCode(digitalUrl);

    this.activeSession.metadata = {
      cafeName: config.cafeName,
      cafeAddress: config.cafeAddress,
      cafePhone: config.cafePhone,
      timestamp: timestampString,
      receiptNumber: Math.floor(1000 + Math.random() * 9000).toString(),
      customMessage: config.customMessage,
      qrCodeUrl: qrDataUrl
    };

    // 5. Kick off background upload if QR codes are enabled
    if (config.enableQrCode !== false) {
      this.activeSession.uploadPromise = (async () => {
        try {
          // Generate high quality B&W and Color comfort card image blobs
          const bwBlob = await generateReceiptBlob(this.activeSession, 'bw');
          const colorBlob = await generateReceiptBlob(this.activeSession, 'color');
          
          this.activeSession.bwBlob = bwBlob;
          this.activeSession.colorBlob = colorBlob;
          
          const shareId = await uploadReceiptPhotos(bwBlob, colorBlob, this.activeSession.shareId);
          
          const hybridUrl = `${baseUrl}/?id=${shareId}`;
          const finalQrUrl = await generateQRCode(hybridUrl);
          
          if (this.activeSession.metadata) {
            this.activeSession.metadata.qrCodeUrl = finalQrUrl;
          }

          // Proactively update rendered HTML preview/print elements with correct QR code
          const previewQrImages = document.querySelectorAll('.receipt-qr-image');
          previewQrImages.forEach((img) => {
            (img as HTMLImageElement).src = finalQrUrl;
          });

          return finalQrUrl;
        } catch (err) {
          console.error('Failed to upload Comfort Card in background:', err);
          return null;
        }
      })();
    } else {
      this.activeSession.uploadPromise = undefined;
    }
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
        thumb.style.left = maxLeft() + 'px';
        track.classList.add('swiped');
        setTimeout(() => onComplete(), 250);
      } else {
        thumb.style.left = '5px';
        setTimeout(() => thumb.classList.add('hint'), 400);
      }
    };

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
}

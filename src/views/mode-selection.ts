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
            <p class="mode-option-desc">Capture a vintage photo collage printed instantly.</p>
            <button class="btn btn-primary mode-option-btn" type="button">START PHOTO BOOTH</button>
          </div>

          <!-- Comfort Card Card -->
          <div class="mode-option-card" id="mode-option-comfort">
            <div class="mode-option-icon">☕</div>
            <h3 class="mode-option-title">Comfort Card</h3>
            <p class="mode-option-desc">Print a warm, deep self-care affirmation.</p>
            <button class="btn btn-primary mode-option-btn" type="button">GET COMFORT CARD</button>
          </div>
        </div>

        <div class="template-screen-footer">
          <button class="btn-tmpl-back-minimal-center" id="btn-mode-back">← BACK TO WELCOME</button>
        </div>
      </div>
    `;

    this.setupEvents();
  }

  unmount(): void {}

  private setupEvents(): void {
    const backBtn = this.element.querySelector('#btn-mode-back');
    backBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.navigateTo('idle');
    });

    const photoCard = this.element.querySelector('#mode-option-photo');
    photoCard?.addEventListener('click', (e) => {
      e.stopPropagation();
      audioManager.playBeep();
      this.navigateTo('template-selection');
    });

    const comfortCard = this.element.querySelector('#mode-option-comfort');
    comfortCard?.addEventListener('click', async (e) => {
      e.stopPropagation();
      audioManager.playBeep();
      
      // Select random Comfort Quote and random illustration, prepare session
      await this.prepareComfortCardSession();

      // Render comfort card HTML and put it in receipt-content-target
      const contentTarget = document.getElementById('receipt-content-target');
      if (contentTarget) {
        contentTarget.innerHTML = renderComfortCard(this.activeSession, this.activeSession.metadata!);
      }

      // Proceed straight to printing state
      this.navigateTo('printing');
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
}

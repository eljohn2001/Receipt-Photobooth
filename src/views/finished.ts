import { BaseView } from './base';
import confetti from 'canvas-confetti';
import type { AppSession } from '../types';
import { audioManager } from '../services/audio';
import { downloadReceiptImage } from '../services/download';

export class FinishedView extends BaseView {
  private activeSession: AppSession;
  private timeoutId: number | null = null;
  private countdownIntervalId: number | null = null;

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
      <div class="finished-screen-content">
        <div class="success-banner">
          <div class="success-icon">✓</div>
          <h2 class="finished-title">YOUR MEMORY IS READY!</h2>
          <p class="finished-subtitle">Tear your print carefully from the slot</p>
        </div>

        <div class="finished-download-card">
          <p class="download-label">Scan to download digital copy</p>
          <div class="finished-qr-container">
            <img class="finished-qr-image" id="finished-qr-img" src="" alt="Download QR" />
          </div>
          <button class="btn btn-download-png" id="btn-finished-download">💾 DOWNLOAD PRINT COPY</button>
          <p class="cafe-tag">Share the joy! Tag us at <strong>@beansandbites</strong></p>
        </div>

        <div class="finished-controls">
          <button class="btn btn-primary" id="btn-finished-again">📸 TAKE ANOTHER</button>
          <button class="btn btn-secondary" id="btn-finished-end">END SESSION</button>
        </div>

        <div class="auto-reset-indicator">
          Returning to start screen in <span id="reset-seconds">20</span>s...
        </div>
      </div>
    `;

    this.setupEvents();
  }

  unmount(): void {
    this.clearTimers();
  }

  onEnter(): void {
    // 0. Play high-quality physical paper tear audio
    audioManager.playPaperTear();

    // 1. Set QR code source from metadata
    const qrImg = this.element.querySelector('#finished-qr-img') as HTMLImageElement;
    if (qrImg && this.activeSession.metadata?.qrCodeUrl) {
      qrImg.src = this.activeSession.metadata.qrCodeUrl;
    }

    // 2. Explode confetti!
    this.triggerConfetti();

    // 3. Start auto-reset timer (20 seconds)
    this.startResetTimer(20);
  }

  onLeave(): void {
    this.clearTimers();
    
    // Revoke local Blob URLs to prevent memory leaks in continuous kiosk execution
    if (this.activeSession.ditheredPhotos) {
      this.activeSession.ditheredPhotos.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    }
    
    if (this.activeSession.metadata?.qrCodeUrl && this.activeSession.metadata.qrCodeUrl.startsWith('blob:')) {
      URL.revokeObjectURL(this.activeSession.metadata.qrCodeUrl);
    }

    // Reset session metadata
    this.activeSession.selectedTemplateId = null;
    this.activeSession.capturedPhotos = [];
    this.activeSession.ditheredPhotos = [];
    this.activeSession.metadata = null;
  }

  private setupEvents() {
    const againBtn = this.element.querySelector('#btn-finished-again');
    const endBtn = this.element.querySelector('#btn-finished-end');
    const downloadBtn = this.element.querySelector('#btn-finished-download') as HTMLButtonElement;

    againBtn?.addEventListener('click', () => {
      audioManager.playBeep();
      this.navigateTo('template-selection');
    });

    endBtn?.addEventListener('click', () => {
      audioManager.playBeep();
      this.navigateTo('idle');
    });

    downloadBtn?.addEventListener('click', async () => {
      if (!this.activeSession.selectedTemplateId || !this.activeSession.metadata) return;

      try {
        downloadBtn.disabled = true;
        const originalText = downloadBtn.textContent;
        downloadBtn.textContent = '⏳ GENERATING PNG...';

        audioManager.playBeep();

        await downloadReceiptImage(this.activeSession);

        downloadBtn.textContent = '✓ DOWNLOADED!';
        setTimeout(() => {
          downloadBtn.disabled = false;
          downloadBtn.textContent = originalText;
        }, 2000);
      } catch (err) {
        console.error('Failed to download image:', err);
        alert('Could not download image. Please try again.');
        downloadBtn.disabled = false;
        downloadBtn.textContent = '💾 DOWNLOAD PRINT COPY';
      }
    });
  }

  private startResetTimer(seconds: number) {
    this.clearTimers();

    const secondsText = this.element.querySelector('#reset-seconds');
    if (secondsText) secondsText.textContent = seconds.toString();

    let remaining = seconds;
    
    this.countdownIntervalId = window.setInterval(() => {
      remaining--;
      if (secondsText) secondsText.textContent = remaining.toString();
    }, 1000);

    this.timeoutId = window.setTimeout(() => {
      this.navigateTo('idle');
    }, seconds * 1000);
  }

  private clearTimers() {
    if (this.timeoutId !== null) {
      window.clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.countdownIntervalId !== null) {
      window.clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
  }

  private triggerConfetti() {
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0, y: 0.8 },
      colors: ['#ffffff', '#aaaaaa', '#555555']
    });

    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1, y: 0.8 },
      colors: ['#ffffff', '#aaaaaa', '#555555']
    });
  }
}

import { BaseView } from './base';
import confetti from 'canvas-confetti';
import type { AppSession } from '../types';
import { audioManager } from '../services/audio';
import { downloadReceiptImage } from '../services/download';
import { loadKioskConfig } from '../services/config';
import { saveOfflineShare } from '../services/db';

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
    const config = loadKioskConfig();
    const socialTag = config.socialTag || 'beansandbites';
    const cleanTag = socialTag.startsWith('@') ? socialTag : `@${socialTag}`;

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
          <p class="cafe-tag">Share the joy! Tag us at <strong>${cleanTag}</strong></p>
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

    // 1. Load config and update the social tag dynamically
    const config = loadKioskConfig();
    const socialTag = config.socialTag || 'beansandbites';
    const cleanTag = socialTag.startsWith('@') ? socialTag : `@${socialTag}`;
    const tagStrong = this.element.querySelector('.cafe-tag strong');
    if (tagStrong) {
      tagStrong.textContent = cleanTag;
    }

    // 2. Reset visual state to initial clean state on every enter
    const downloadLabel = this.element.querySelector('.download-label');
    if (downloadLabel) {
      downloadLabel.textContent = 'Scan to download digital copy';
    }
    const qrContainer = this.element.querySelector('.finished-qr-container') as HTMLElement;
    if (qrContainer) {
      qrContainer.style.display = 'flex';
      const loadingTxts = qrContainer.querySelectorAll('div');
      loadingTxts.forEach(txt => txt.remove());
    }
    const qrImg = this.element.querySelector('#finished-qr-img') as HTMLImageElement;
    if (qrImg) {
      qrImg.src = '';
      qrImg.classList.add('hidden');
    }
    const offlineWarning = this.element.querySelector('.offline-warning-card');
    if (offlineWarning) {
      offlineWarning.remove();
    }

    // If QR code feature is disabled, hide elements and return early
    if (config.enableQrCode === false) {
      if (downloadLabel) {
        downloadLabel.textContent = 'Digital copy disabled';
      }
      if (qrContainer) {
        qrContainer.style.display = 'none';
      }
      if (qrImg) {
        qrImg.classList.add('hidden');
      }
      
      // Explode confetti!
      this.triggerConfetti();

      // Start auto-reset timer (20 seconds)
      this.startResetTimer(20);
      return;
    }

    // 3. Set QR code source from metadata (awaiting background upload if active)
    let loadingText: HTMLDivElement | null = null;
    if (qrContainer && this.activeSession.uploadPromise) {
      loadingText = document.createElement('div');
      loadingText.style.fontFamily = 'var(--font-ui)';
      loadingText.style.fontSize = '12px';
      loadingText.style.color = 'var(--text-primary)';
      loadingText.style.textAlign = 'center';
      loadingText.style.fontWeight = 'bold';
      loadingText.innerHTML = `⏳ GENERATING QR CODE...`;
      qrContainer.appendChild(loadingText);
    }

    if (this.activeSession.uploadPromise) {
      this.activeSession.uploadPromise.then((url) => {
        if (loadingText) loadingText.remove();
        if (url) {
          if (qrImg) {
            qrImg.src = url;
            qrImg.classList.remove('hidden');
          }
        } else {
          // If url is null (meaning upload failed in background)
          this.showOfflineNotice();
        }
      }).catch((err) => {
        if (loadingText) loadingText.remove();
        console.error('Failed to load uploaded QR url:', err);
        this.showOfflineNotice();
      });
    } else {
      // No upload promise
      this.showOfflineNotice();
    }

    // 4. Explode confetti!
    this.triggerConfetti();

    // 5. Start auto-reset timer (20 seconds)
    this.startResetTimer(20);
  }

  private showOfflineNotice(): void {
    const downloadLabel = this.element.querySelector('.download-label');
    if (downloadLabel) {
      downloadLabel.textContent = 'Digital copy unavailable';
    }
    
    // Hide the QR container
    const qrContainer = this.element.querySelector('.finished-qr-container') as HTMLElement;
    if (qrContainer) {
      qrContainer.style.display = 'none';
    }

    // Cache photo blobs locally in IndexedDB for later manual synchronization
    if (this.activeSession.bwBlob && this.activeSession.colorBlob && this.activeSession.metadata) {
      const offlineId = `offline-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
      saveOfflineShare({
        id: offlineId,
        timestamp: this.activeSession.metadata.timestamp,
        bwBlob: this.activeSession.bwBlob,
        colorBlob: this.activeSession.colorBlob
      }).then(() => {
        console.log(`Saved offline capture locally: ${offlineId}`);
      }).catch((err) => {
        console.error('Failed to save offline capture locally:', err);
      });
    }

    // Check if offline warning already exists
    let offlineWarning = this.element.querySelector('.offline-warning-card');
    if (!offlineWarning) {
      offlineWarning = document.createElement('div');
      offlineWarning.className = 'offline-warning-card';
      
      // Inline styles matching style.css design system
      (offlineWarning as HTMLElement).style.display = 'flex';
      (offlineWarning as HTMLElement).style.flexDirection = 'column';
      (offlineWarning as HTMLElement).style.alignItems = 'center';
      (offlineWarning as HTMLElement).style.justifyContent = 'center';
      (offlineWarning as HTMLElement).style.padding = '16px';
      (offlineWarning as HTMLElement).style.color = 'var(--accent-danger)';
      (offlineWarning as HTMLElement).style.textAlign = 'center';
      (offlineWarning as HTMLElement).style.fontFamily = 'var(--font-ui)';
      (offlineWarning as HTMLElement).style.fontSize = '12px';
      (offlineWarning as HTMLElement).style.fontWeight = 'bold';
      (offlineWarning as HTMLElement).style.lineHeight = '1.6';
      (offlineWarning as HTMLElement).style.border = '1px dashed var(--accent-danger)';
      (offlineWarning as HTMLElement).style.borderRadius = '0px';
      (offlineWarning as HTMLElement).style.backgroundColor = 'rgba(255, 0, 0, 0.05)';
      (offlineWarning as HTMLElement).style.margin = '15px 0';
      
      offlineWarning.innerHTML = `
        <div style="font-size: 15px; margin-bottom: 4px; letter-spacing: 1px;">⚠️ OFFLINE MODE</div>
        <div style="font-weight: normal; color: var(--text-secondary); font-size: 11px;">
          Upload skipped. Digital copy saved locally.
        </div>
      `;

      // Insert it right after download label
      if (downloadLabel && downloadLabel.parentNode) {
        downloadLabel.parentNode.insertBefore(offlineWarning, qrContainer);
      }
    }
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

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
    this.element.innerHTML = `
      <div class="finished-screen-content">
        <div class="success-banner">
          <div class="success-icon">✓</div>
          <h2 class="finished-title">YOUR MEMORY IS READY!</h2>
          <p class="finished-subtitle">Tear your print carefully from the slot</p>
        </div>

        <div class="finished-download-card" id="finished-card-container">
          <!-- Visual receipt card injected here -->
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

    // 1. Load config and update values dynamically
    const config = loadKioskConfig();
    const socialTag = config.socialTag || 'beansandbites';
    const cleanTag = socialTag.startsWith('@') ? socialTag : `@${socialTag}`;

    const cardContainer = this.element.querySelector('#finished-card-container');
    if (!cardContainer) return;

    cardContainer.innerHTML = ''; // Clear previous content

    const logoUrl = config.logoScreenDataUrl || config.logoDataUrl;
    const logoHtml = logoUrl 
      ? `<img src="${logoUrl}" class="thank-you-logo" />` 
      : `<div class="thank-you-logo-placeholder">☕️</div>`;
      
    const dateStr = new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    const printsCount = this.activeSession.copiesCount || 1;
    const printsStr = `${printsCount} ${printsCount === 1 ? 'COPY' : 'COPIES'}`;

    const hasQr = config.enableQrCode !== false;

    const thankYouCard = document.createElement('div');
    thankYouCard.className = 'finished-thank-you-card animate-pop-in';
    thankYouCard.innerHTML = `
      <!-- Circular cutouts for receipt appearance -->
      <div class="receipt-cutout left"></div>
      <div class="receipt-cutout right"></div>

      ${logoHtml}
      <h3 class="thank-you-cafe-name">THANK YOU</h3>
      <p class="thank-you-message">Your print memory has been processed successfully.</p>
      
      ${hasQr ? `
        <div class="thank-you-divider"></div>
        <div class="finished-qr-section" style="width: 100%;">
          <p class="download-label" style="font-family: var(--font-ui); font-size: 13.5px; font-weight: 700; color: var(--text-primary); margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">Scan to download digital copy</p>
          <div class="finished-qr-container" style="display: flex; justify-content: center; align-items: center; margin: 0 auto 15px auto; width: 180px; height: 180px; border: 1.5px solid var(--border-primary); padding: 8px; background: #ffffff; position: relative; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
            <img class="finished-qr-image" id="finished-qr-img" src="" alt="Download QR" style="width: 100%; height: 100%; object-fit: contain;" />
          </div>
          <p class="cafe-tag" style="font-family: var(--font-ui); font-size: 12px; color: var(--text-secondary); margin: 0 0 10px 0;">Share the joy! Tag us at <strong>${cleanTag}</strong></p>
        </div>
      ` : ''}
      
      <div class="thank-you-divider"></div>
      
      <div class="receipt-meta-grid">
        <div class="receipt-meta-item">
          <span class="receipt-meta-label">LOCATION</span>
          <span class="receipt-meta-val">${config.cafeAddress}</span>
        </div>
        <div class="receipt-meta-item" style="text-align: right;">
          <span class="receipt-meta-label">PRINTS</span>
          <span class="receipt-meta-val">${printsStr}</span>
        </div>
        <div class="receipt-meta-item" style="grid-column: span 2; margin-top: 6px;">
          <span class="receipt-meta-label">DATE & TIME</span>
          <span class="receipt-meta-val">${dateStr} | ${timeStr}</span>
        </div>
      </div>
      
      <div class="thank-you-divider"></div>
      
      <div class="thank-you-barcode">
        <svg viewBox="0 0 100 30" width="100%" height="45">
          <rect x="0" y="0" width="2" height="22" fill="#000" />
          <rect x="3" y="0" width="1" height="22" fill="#000" />
          <rect x="6" y="0" width="3" height="22" fill="#000" />
          <rect x="11" y="0" width="1" height="22" fill="#000" />
          <rect x="14" y="0" width="2" height="22" fill="#000" />
          <rect x="18" y="0" width="4" height="22" fill="#000" />
          <rect x="24" y="0" width="1" height="22" fill="#000" />
          <rect x="27" y="0" width="2" height="22" fill="#000" />
          <rect x="31" y="0" width="3" height="22" fill="#000" />
          <rect x="36" y="0" width="1" height="22" fill="#000" />
          <rect x="39" y="0" width="2" height="22" fill="#000" />
          <rect x="43" y="0" width="4" height="22" fill="#000" />
          <rect x="49" y="0" width="1" height="22" fill="#000" />
          <rect x="52" y="0" width="2" height="22" fill="#000" />
          <rect x="56" y="0" width="3" height="22" fill="#000" />
          <rect x="61" y="0" width="1" height="22" fill="#000" />
          <rect x="64" y="0" width="2" height="22" fill="#000" />
          <rect x="68" y="0" width="4" height="22" fill="#000" />
          <rect x="74" y="0" width="1" height="22" fill="#000" />
          <rect x="77" y="0" width="2" height="22" fill="#000" />
          <rect x="81" y="0" width="3" height="22" fill="#000" />
          <rect x="86" y="0" width="1" height="22" fill="#000" />
          <rect x="89" y="0" width="2" height="22" fill="#000" />
          <rect x="93" y="0" width="4" height="22" fill="#000" />
          <text x="50" y="28" font-size="5" text-anchor="middle" font-family="Courier New, monospace" font-weight="bold" fill="#000">${config.cafeName.toUpperCase()}</text>
        </svg>
      </div>

      <!-- Jagged scallops at bottom -->
      <div class="receipt-bottom-scallops"></div>
    `;
    cardContainer.appendChild(thankYouCard);

    // If QR code feature is disabled, return early
    if (!hasQr) {
      this.triggerConfetti();
      this.startResetTimer(20);
      return;
    }

    // Dynamic QR resolution bindings
    const qrContainer = this.element.querySelector('.finished-qr-container') as HTMLElement;
    const qrImg = this.element.querySelector('#finished-qr-img') as HTMLImageElement;

    let loadingText: HTMLDivElement | null = null;
    if (qrContainer && this.activeSession.uploadPromise) {
      loadingText = document.createElement('div');
      loadingText.style.fontFamily = 'var(--font-ui)';
      loadingText.style.fontSize = '12px';
      loadingText.style.color = 'var(--text-primary)';
      loadingText.style.textAlign = 'center';
      loadingText.style.fontWeight = 'bold';
      loadingText.style.position = 'absolute';
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
          this.showOfflineNotice();
        }
      }).catch((err) => {
        if (loadingText) loadingText.remove();
        console.error('Failed to load uploaded QR url:', err);
        this.showOfflineNotice();
      });
    } else {
      this.showOfflineNotice();
    }

    this.triggerConfetti();
    this.startResetTimer(20);
  }

  private showOfflineNotice(): void {
    const downloadLabel = this.element.querySelector('.download-label');
    if (downloadLabel) {
      downloadLabel.textContent = 'Scan to save link (Pending Kiosk Sync)';
    }
    
    // Do NOT hide the QR container. Show it.
    const qrContainer = this.element.querySelector('.finished-qr-container') as HTMLElement;
    if (qrContainer) {
      qrContainer.style.display = 'flex';
    }
    const qrImg = this.element.querySelector('#finished-qr-img') as HTMLImageElement;
    if (qrImg && this.activeSession.metadata?.qrCodeUrl) {
      qrImg.src = this.activeSession.metadata.qrCodeUrl;
      qrImg.classList.remove('hidden');
    }

    // Cache photo blobs locally in IndexedDB for later manual synchronization
    if (this.activeSession.bwBlob && this.activeSession.colorBlob && this.activeSession.metadata && this.activeSession.shareId) {
      const offlineId = this.activeSession.shareId;
      saveOfflineShare({
        id: offlineId,
        timestamp: this.activeSession.metadata.timestamp,
        bwBlob: this.activeSession.bwBlob,
        colorBlob: this.activeSession.colorBlob
      }).then(() => {
        console.log(`Saved offline capture locally with ID: ${offlineId}`);
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
          Saved locally. Scan to save link. Photo will load once synced.
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
    const downloadBtn = this.element.querySelector('#btn-finished-download') as HTMLButtonElement | null;

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
    // Left side burst
    confetti({
      particleCount: 120,
      angle: 60,
      spread: 70,
      origin: { x: 0, y: 0.85 },
      colors: ['#ffffff', '#aaaaaa', '#555555', '#007aff']
    });

    // Right side burst
    confetti({
      particleCount: 120,
      angle: 120,
      spread: 70,
      origin: { x: 1, y: 0.85 },
      colors: ['#ffffff', '#aaaaaa', '#555555', '#007aff']
    });

    // Center delay burst for maximum depth!
    setTimeout(() => {
      confetti({
        particleCount: 80,
        angle: 90,
        spread: 80,
        origin: { x: 0.5, y: 0.8 },
        colors: ['#ffffff', '#bbbbbb', '#777777']
      });
    }, 200);
  }
}

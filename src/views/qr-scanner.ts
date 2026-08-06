import { BaseView } from './base';
import type { AppSession, PrintPackage } from '../types';
import { loadKioskConfig } from '../services/config';
import { audioManager } from '../services/audio';
import { hapticService } from '../services/haptics';
import { parsePackageQrData } from '../services/qr-parser';
import jsQR from 'jsqr';

export class QrScannerView extends BaseView {
  private activeSession: AppSession;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private canvasContext: CanvasRenderingContext2D | null = null;
  private mediaStream: MediaStream | null = null;
  private isScanning: boolean = false;
  private scanAnimFrameId: number | null = null;
  private hasDetected: boolean = false;

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
        <div class="kiosk-app-bar">
          <button class="kiosk-back-btn" id="btn-qr-back" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            <span>BACK</span>
          </button>
          <div class="kiosk-app-bar-titles">
            <h2 class="kiosk-screen-title">Scan Your Package QR Code</h2>
            <p class="kiosk-screen-subtitle">Position your QR Code inside the frame. The package will be detected automatically.</p>
          </div>
        </div>

        <div class="qr-scanner-viewport-container">
          <div class="qr-scanner-frame-card">
            <!-- Camera Viewfinder Container -->
            <div class="camera-viewfinder-box" id="qr-camera-box">
              <video id="qr-video" class="qr-video-stream" autoplay playsinline muted></video>
              <canvas id="qr-canvas" style="display: none;"></canvas>

              <!-- Viewfinder Overlay Graphics -->
              <div class="viewfinder-overlay">
                <div class="corner-bracket top-left"></div>
                <div class="corner-bracket top-right"></div>
                <div class="corner-bracket bottom-left"></div>
                <div class="corner-bracket bottom-right"></div>
                
                <!-- Pulsing Scan Laser -->
                <div class="scan-laser-line"></div>
              </div>

              <!-- Camera Loading Placeholder -->
              <div class="camera-loading-overlay" id="qr-camera-loading">
                <div class="spinner"></div>
                <p>Initializing Camera...</p>
              </div>
            </div>

            <!-- Instruction Banner below camera -->
            <div class="qr-scanner-guidance">
              <div class="guidance-pill">
                <span class="pulse-dot"></span>
                <span>Hold your cashier Package QR Code up to the front camera</span>
              </div>
            </div>

            <!-- Error Banner -->
            <div id="qr-error-banner" class="paywall-error-banner hidden" style="margin-top: 15px;"></div>

            <!-- Dev / Staff Test Shortcuts -->
            <div class="qr-test-shortcuts-box">
              <span class="shortcuts-title">⚡ QUICK TEST QR SHORTCUTS (DEV & CASHIER TEST)</span>
              <div class="shortcuts-btns-grid">
                <button type="button" class="btn-qr-shortcut" data-qr="PACKAGE_A|PRINTS=1">Pkg A (1 Print)</button>
                <button type="button" class="btn-qr-shortcut" data-qr="PACKAGE_B|PRINTS=2">Pkg B (2 Prints)</button>
                <button type="button" class="btn-qr-shortcut" data-qr="PACKAGE_C|PRINTS=3">Pkg C (3 Prints)</button>
                <button type="button" class="btn-qr-shortcut" data-qr="PACKAGE_D|PRINTS=4">Pkg D (4 Prints)</button>
              </div>
            </div>

          </div>
        </div>

        <!-- Success Modal Overlay -->
        <div id="qr-success-modal" class="kiosk-modal-overlay hidden">
          <div class="kiosk-modal-card qr-success-card animate-pop-in">
            <div class="qr-success-icon-wrapper">
              <svg viewBox="0 0 52 52" class="confirmation-svg">
                <circle cx="26" cy="26" r="25" fill="none" class="circle-path" />
                <path fill="none" class="check-path" d="M14.1 27.2l7.1 7.2 16.7-16.8" />
              </svg>
            </div>
            <div class="qr-success-badge">✓ PACKAGE DETECTED</div>
            <h3 class="qr-success-title" id="qr-modal-pkg-name">Package A</h3>
            <p class="qr-success-subtitle" id="qr-modal-prints-label">1 Print Included</p>
            <div class="qr-success-loader">
              <div class="mini-spinner"></div>
              <span>Preparing your session...</span>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupEvents();
  }

  unmount(): void {
    this.stopCamera();
  }

  onEnter(): void {
    this.hasDetected = false;
    const modal = this.element.querySelector('#qr-success-modal');
    modal?.classList.add('hidden');

    const errBanner = this.element.querySelector('#qr-error-banner');
    errBanner?.classList.add('hidden');

    this.startCamera();
  }

  onLeave(): void {
    this.stopCamera();
  }

  private setupEvents(): void {
    const backBtn = this.element.querySelector('#btn-qr-back');
    backBtn?.addEventListener('click', () => {
      audioManager.playBeep();
      this.stopCamera();
      this.navigateTo('cash-instruction');
    });

    // Wire up dev/staff test QR shortcuts
    const shortcuts = this.element.querySelectorAll('.btn-qr-shortcut');
    shortcuts.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const qrData = btn.getAttribute('data-qr');
        if (qrData) {
          audioManager.playBeep();
          this.handleQrDetected(qrData);
        }
      });
    });
  }

  private async startCamera(): Promise<void> {
    const loadingOverlay = this.element.querySelector('#qr-camera-loading') as HTMLElement;
    this.videoElement = this.element.querySelector('#qr-video') as HTMLVideoElement;
    this.canvasElement = this.element.querySelector('#qr-canvas') as HTMLCanvasElement;

    if (this.canvasElement) {
      this.canvasContext = this.canvasElement.getContext('2d', { willReadFrequently: true });
    }

    if (!this.videoElement) return;

    if (loadingOverlay) loadingOverlay.classList.remove('hidden');

    try {
      // Priority 1: User-facing camera (front tablet camera)
      try {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false
        });
      } catch (err) {
        // Fallback: Any available camera
        this.mediaStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });
      }

      this.videoElement.srcObject = this.mediaStream;
      await this.videoElement.play();

      if (loadingOverlay) loadingOverlay.classList.add('hidden');

      this.isScanning = true;
      this.scanLoop();
    } catch (error: any) {
      console.warn('Could not start QR camera:', error);
      if (loadingOverlay) {
        loadingOverlay.innerHTML = `
          <div style="font-size: 32px; margin-bottom: 8px;">📷</div>
          <p style="font-size: 13px; font-weight: bold; color: #ff3b30;">Camera Stream Unavailable</p>
          <p style="font-size: 11px; opacity: 0.8; margin-top: 4px;">Use the Quick Test buttons below or check web permissions.</p>
        `;
      }
    }
  }

  private stopCamera(): void {
    this.isScanning = false;
    if (this.scanAnimFrameId !== null) {
      cancelAnimationFrame(this.scanAnimFrameId);
      this.scanAnimFrameId = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }
  }

  private scanLoop(): void {
    if (!this.isScanning || this.hasDetected) return;

    if (this.videoElement && this.videoElement.readyState === this.videoElement.HAVE_ENOUGH_DATA) {
      const width = this.videoElement.videoWidth;
      const height = this.videoElement.videoHeight;

      if (this.canvasElement && this.canvasContext && width > 0 && height > 0) {
        this.canvasElement.width = width;
        this.canvasElement.height = height;
        this.canvasContext.drawImage(this.videoElement, 0, 0, width, height);

        const imageData = this.canvasContext.getImageData(0, 0, width, height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data && code.data.trim().length > 0) {
          this.handleQrDetected(code.data.trim());
          return;
        }
      }
    }

    this.scanAnimFrameId = requestAnimationFrame(() => this.scanLoop());
  }

  private handleQrDetected(qrContent: string): void {
    if (this.hasDetected) return;
    this.hasDetected = true;
    this.isScanning = false;

    audioManager.playBeep();
    hapticService.impactMedium();

    const parsed = parsePackageQrData(qrContent);
    const errBanner = this.element.querySelector('#qr-error-banner') as HTMLElement;

    if (!parsed.isValid) {
      if (errBanner) {
        errBanner.textContent = `⚠️ Invalid QR Code: ${parsed.errorMessage || 'Unknown format'}`;
        errBanner.classList.remove('hidden');
      }
      setTimeout(() => {
        this.hasDetected = false;
        this.isScanning = true;
        this.scanLoop();
      }, 2000);
      return;
    }

    if (errBanner) errBanner.classList.add('hidden');

    // Match parsed package against Kiosk Config packages
    const config = loadKioskConfig();
    let matchedPkg: PrintPackage | undefined;

    const cleanParsedId = parsed.packageId.toUpperCase();

    // 1. Exact or ID match
    matchedPkg = (config.packages || []).find(p => {
      const pId = p.id.toUpperCase();
      const pName = p.name.toUpperCase();
      const pQrCode = (p.qrDataCode || '').toUpperCase();
      return pId === cleanParsedId || 
             pName === cleanParsedId || 
             pQrCode.includes(cleanParsedId) ||
             (cleanParsedId === 'PACKAGE_A' && (pId === 'PKG-A' || pName.includes('PACKAGE A'))) ||
             (cleanParsedId === 'PACKAGE_B' && (pId === 'PKG-B' || pName.includes('PACKAGE B'))) ||
             (cleanParsedId === 'PACKAGE_C' && (pId === 'PKG-C' || pName.includes('PACKAGE C'))) ||
             (cleanParsedId === 'PACKAGE_D' && (pId === 'PKG-D' || pName.includes('PACKAGE D')));
    });

    // Fallback if not directly matched: construct package object from parsed parameters
    if (!matchedPkg) {
      const prints = parsed.printsCount || 1;
      const photoCount = parsed.photoCount || 3;
      matchedPkg = {
        id: parsed.packageId.toLowerCase(),
        name: `Package ${parsed.packageId.replace('PACKAGE_', '')}`,
        printsCount: prints,
        photoCount: photoCount,
        price: prints * 50,
        isEnabled: true,
        inclusions: `${prints} Thermal Print ${prints === 1 ? '' : 's'} + Digital Softcopy`,
        allowedLayouts: parsed.allowedLayouts || [],
        qrDataCode: qrContent
      };
    }

    // Check paper remaining
    const paperRemaining = config.paperPrintsRemaining !== undefined ? config.paperPrintsRemaining : 150;
    if (matchedPkg.printsCount > paperRemaining) {
      alert(`⚠️ Low Paper Notice: This package requires ${matchedPkg.printsCount} prints, but only ${paperRemaining} prints remain. Please ask cashier for assistance.`);
      this.hasDetected = false;
      this.isScanning = true;
      this.scanLoop();
      return;
    }

    // Apply scanned package to active session & lock session
    this.activeSession.selectedPackage = matchedPkg;
    this.activeSession.copiesCount = matchedPkg.printsCount;
    this.activeSession.isPaid = true;
    this.activeSession.isPackageLocked = true;
    this.activeSession.paymentMethod = 'cash';
    this.activeSession.scannedPackageQr = qrContent;

    // Display Mobbin-inspired Success Confirmation Modal
    const modal = this.element.querySelector('#qr-success-modal');
    const nameEl = this.element.querySelector('#qr-modal-pkg-name');
    const printsEl = this.element.querySelector('#qr-modal-prints-label');

    if (nameEl) nameEl.textContent = matchedPkg.name;
    if (printsEl) printsEl.textContent = `${matchedPkg.printsCount} ${matchedPkg.printsCount === 1 ? 'Print' : 'Prints'} Included`;

    modal?.classList.remove('hidden');

    // Auto-continue to Layout Selection after 1.5 seconds
    setTimeout(() => {
      this.stopCamera();
      this.navigateTo('template-selection');
    }, 1500);
  }
}

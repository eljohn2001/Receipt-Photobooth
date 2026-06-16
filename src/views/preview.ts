import { BaseView } from './base';
import { ditherImage } from '../services/dither';
import { generateQRCode } from '../services/qr';
import { getTemplateById } from '../templates';
import type { AppSession, ReceiptMetadata } from '../types';
import { loadKioskConfig } from '../services/config';
import { generateReceiptBlob } from '../services/download';
import { uploadImage } from '../services/upload';

export class PreviewView extends BaseView {
  private activeSession: AppSession;
  private printBtn: HTMLButtonElement | null = null;
  private retakeBtn: HTMLButtonElement | null = null;

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
      <div class="preview-screen-content">
        <div class="screen-header">
          <button class="btn-back" id="btn-preview-retake-header">← RETAKE</button>
          <div class="header-titles">
            <h2 class="view-title">PREVIEW PRINT</h2>
            <p class="view-subtitle">Review your thermal receipt memory</p>
          </div>
          <div style="width: 60px;"></div>
        </div>

        <div class="preview-layout-container">
          <!-- Thermal Paper receipt simulator -->
          <div class="thermal-paper-scroll-wrapper">
            <div class="thermal-paper" id="preview-thermal-paper">
              <!-- Loading spinner / dither loader -->
              <div class="dither-loader" id="dither-loader">
                <div class="spinner"></div>
                <p class="loader-text">DITHERING ANALOG RENDER...</p>
              </div>
              
              <!-- Actual receipt contents -->
              <div class="receipt-content-target hidden" id="receipt-content-target"></div>
            </div>
          </div>
        </div>

        <!-- Print Configuration Options Panel -->
        <div class="preview-options-panel">
          <div class="option-control-group">
            <span class="option-label">🖨 Copies</span>
            <div class="quantity-selector">
              <button type="button" class="btn-qty" id="btn-qty-minus">−</button>
              <span class="qty-val" id="qty-val">1</span>
              <button type="button" class="btn-qty" id="btn-qty-plus">+</button>
            </div>
          </div>
          
          <div class="option-control-group">
            <span class="option-label">🪞 Mirror Photo</span>
            <label class="toggle-switch">
              <input type="checkbox" id="toggle-mirror" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- Sticky viewport controls -->
        <div class="preview-actions-bar">
          <button class="btn btn-secondary btn-half" id="btn-preview-retake">🔄 RETAKE</button>
          <button class="btn btn-primary btn-half btn-glow" id="btn-preview-print" disabled>🖨 PRINT NOW</button>
        </div>
      </div>
    `;

    this.printBtn = this.element.querySelector('#btn-preview-print') as HTMLButtonElement;
    this.retakeBtn = this.element.querySelector('#btn-preview-retake') as HTMLButtonElement;

    this.setupEvents();
  }

  unmount(): void {}

  async onEnter(): Promise<void> {
    const loader = this.element.querySelector('#dither-loader');
    const contentTarget = this.element.querySelector('#receipt-content-target');
    const paper = this.element.querySelector('#preview-thermal-paper');
    
    // Reset session variables
    this.activeSession.isMirrored = false;
    this.activeSession.copiesCount = 1;

    // Reset options UI defaults
    const mirrorCheckbox = this.element.querySelector('#toggle-mirror') as HTMLInputElement;
    if (mirrorCheckbox) mirrorCheckbox.checked = false;
    
    const qtyValEl = this.element.querySelector('#qty-val');
    if (qtyValEl) qtyValEl.textContent = '1';

    // Reset slide-down exit animation states
    paper?.classList.remove('slide-down-exit');
    
    if (loader) loader.classList.remove('hidden');
    if (contentTarget) {
      contentTarget.classList.add('hidden');
      contentTarget.innerHTML = '';
    }
    if (this.printBtn) this.printBtn.disabled = true;

    const template = getTemplateById(this.activeSession.selectedTemplateId || '');
    if (!template || this.activeSession.capturedPhotos.length === 0) {
      console.error('Invalid preview state: missing template or photos');
      this.navigateTo('template-selection');
      return;
    }

    try {
      // 1. Process all images through the high-quality grayscale photo service
      const ditheredPromises = this.activeSession.capturedPhotos.map((photo) =>
        ditherImage(photo, 720) // Target 720px width for sharp, high-quality vintage print style
      );
      this.activeSession.ditheredPhotos = await Promise.all(ditheredPromises);

      // 2. Generate custom receipt details
      const receiptNumber = Math.floor(1000 + Math.random() * 9000).toString();
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

      // 3. Generate QR code link pointing to our own dynamic origin
      const baseUrl = window.location.origin;
      const digitalUrl = `${baseUrl}/`;
      const qrDataUrl = await generateQRCode(digitalUrl);

      const config = loadKioskConfig();

      // Build metadata
      const metadata: ReceiptMetadata = {
        cafeName: config.cafeName,
        cafeAddress: config.cafeAddress,
        cafePhone: config.cafePhone,
        timestamp: timestampString,
        receiptNumber: receiptNumber,
        customMessage: config.customMessage,
        qrCodeUrl: qrDataUrl,
      };
      
      this.activeSession.metadata = metadata;

      // 4. Render template HTML
      const templateHtml = template.render(this.activeSession.ditheredPhotos, metadata);

      // 5. Append generated HTML directly (ends right after the location/date footer)
      if (contentTarget) {
        contentTarget.innerHTML = templateHtml;
      }

      // Hide loader, show content
      if (loader) loader.classList.add('hidden');
      if (contentTarget) contentTarget.classList.remove('hidden');
      if (this.printBtn) this.printBtn.disabled = false;

    } catch (error) {
      console.error('Failed to process preview:', error);
      alert('Error rendering receipt preview. Returning to capture.');
      this.navigateTo('camera-capture');
    }
  }

  onLeave(): void {
    if (this.printBtn) this.printBtn.disabled = true;
  }

  private setupEvents(): void {
    // Back header button and primary Retake button both return to camera capture
    const headerRetakeBtn = this.element.querySelector('#btn-preview-retake-header');
    
    const triggerRetake = () => {
      this.navigateTo('camera-capture');
    };

    this.retakeBtn?.addEventListener('click', triggerRetake);
    headerRetakeBtn?.addEventListener('click', triggerRetake);

    // Copies control buttons
    const minusBtn = this.element.querySelector('#btn-qty-minus');
    const plusBtn = this.element.querySelector('#btn-qty-plus');
    const qtyVal = this.element.querySelector('#qty-val');

    minusBtn?.addEventListener('click', () => {
      let current = this.activeSession.copiesCount || 1;
      if (current > 1) {
        current--;
        this.activeSession.copiesCount = current;
        if (qtyVal) qtyVal.textContent = current.toString();
      }
    });

    plusBtn?.addEventListener('click', () => {
      let current = this.activeSession.copiesCount || 1;
      if (current < 5) {
        current++;
        this.activeSession.copiesCount = current;
        if (qtyVal) qtyVal.textContent = current.toString();
      }
    });

    // Mirror image toggle switch
    const mirrorToggle = this.element.querySelector('#toggle-mirror') as HTMLInputElement;
    mirrorToggle?.addEventListener('change', () => {
      const mirror = mirrorToggle.checked;
      this.activeSession.isMirrored = mirror;
      
      const receiptContainer = this.element.querySelector('.collage-receipt-container');
      if (receiptContainer) {
        if (mirror) {
          receiptContainer.classList.add('receipt-mirrored');
        } else {
          receiptContainer.classList.remove('receipt-mirrored');
        }
      }
    });

    // Print button triggers printing screen and triggers standard print
    this.printBtn?.addEventListener('click', () => {
      // 1. Kick off background upload before transitioning
      this.activeSession.uploadPromise = (async () => {
        try {
          const blob = await generateReceiptBlob(this.activeSession);
          const uploadedUrl = await uploadImage(blob);
          const baseUrl = window.location.origin;
          const hybridUrl = `${baseUrl}/?photo=${encodeURIComponent(uploadedUrl)}`;
          const qrDataUrl = await generateQRCode(hybridUrl);
          
          if (this.activeSession.metadata) {
            this.activeSession.metadata.qrCodeUrl = qrDataUrl;
          }
          return qrDataUrl;
        } catch (err) {
          console.error('Failed to upload receipt in background:', err);
          return null; // Fallback to local default QR code url on error
        }
      })();

      const paperEl = this.element.querySelector('#preview-thermal-paper');
      if (paperEl) {
        paperEl.classList.add('slide-down-exit');
        
        // Disable buttons to prevent multiple clicks
        if (this.printBtn) this.printBtn.disabled = true;
        if (this.retakeBtn) this.retakeBtn.disabled = true;
        
        // Navigate after paper slides down completely
        setTimeout(() => {
          this.navigateTo('printing');
        }, 800);
      } else {
        this.navigateTo('printing');
      }
    });
  }
}

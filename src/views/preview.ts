import { BaseView } from './base';
import { ditherImage } from '../services/dither';
import { generateQRCode } from '../services/qr';
import { getTemplateById } from '../templates';
import type { AppSession, ReceiptMetadata } from '../types';
import { loadKioskConfig } from '../services/config';
import { generateReceiptBlob } from '../services/download';
import { uploadReceiptPhotos } from '../services/upload';
import { generateShortId } from '../services/supabase';
// @ts-ignore - raw loader is supported by Vite
import quotesRaw from '../Quotes.txt?raw';
import { THEMES_BY_TEMPLATE } from '../themes';
import { audioManager } from '../services/audio';

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

        <!-- Theme selector container will go here -->
        <div id="theme-selector-wrapper"></div>

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
    const pkg = this.activeSession.selectedPackage;
    this.activeSession.copiesCount = pkg ? pkg.printsCount : 1;
    this.activeSession.shareId = generateShortId(6);
    this.activeSession.selectedThemeId = 'default';

    // Hide quantity adjustment buttons to enforce package locks
    const qtyMinusBtn = this.element.querySelector('#btn-qty-minus') as HTMLElement;
    const qtyPlusBtn = this.element.querySelector('#btn-qty-plus') as HTMLElement;
    if (qtyMinusBtn && qtyPlusBtn) {
      qtyMinusBtn.style.display = 'none';
      qtyPlusBtn.style.display = 'none';
    }

    // Reset options UI defaults
    const mirrorCheckbox = this.element.querySelector('#toggle-mirror') as HTMLInputElement;
    if (mirrorCheckbox) mirrorCheckbox.checked = false;
    
    const qtyValEl = this.element.querySelector('#qty-val');
    if (qtyValEl) {
      const count = this.activeSession.copiesCount || 1;
      qtyValEl.textContent = `${count} Cop${count > 1 ? 'ies' : 'y'} 🔒`;
    }

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
      // Select surprise quote for Memory Fortune (if enabled)
      const config = loadKioskConfig();
      if (config.enableMemoryFortune !== false) {
        try {
          const allQuotes = quotesRaw
            .split('\n')
            .map((q: string) => q.trim())
            .filter(Boolean);

          let matchingQuotes: string[] = [];

          // Categorize the 98 quotes into 4 segments corresponding to the 4 templates
          // classic-solo: 0 to 24 (25 quotes)
          // duet-grid: 25 to 49 (25 quotes)
          // film-stack: 50 to 74 (25 quotes)
          // hex-grid: 75 to 97 (23 quotes)
          if (template.id === 'classic-solo') {
            matchingQuotes = allQuotes.slice(0, 25);
          } else if (template.id === 'duet-grid') {
            matchingQuotes = allQuotes.slice(25, 50);
          } else if (template.id === 'film-stack') {
            matchingQuotes = allQuotes.slice(50, 75);
          } else if (template.id === 'hex-grid') {
            matchingQuotes = allQuotes.slice(75, 98);
          } else {
            matchingQuotes = allQuotes; // fallback
          }

          if (matchingQuotes.length > 0) {
            const randomIndex = Math.floor(Math.random() * matchingQuotes.length);
            this.activeSession.selectedQuote = matchingQuotes[randomIndex];
            console.log(`Memory Fortune selected quote [Category: ${template.id}]: "${this.activeSession.selectedQuote}"`);
          } else {
            this.activeSession.selectedQuote = undefined;
          }
        } catch (e) {
          console.warn('Failed to select Memory Fortune quote:', e);
          this.activeSession.selectedQuote = undefined;
        }
      } else {
        this.activeSession.selectedQuote = undefined;
      }

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

      // 3. Generate QR code link pointing to our hosted origin
      const baseUrl = 'https://photoreceipt.stoodioph.com';
      const digitalUrl = `${baseUrl}/?id=${this.activeSession.shareId}`;
      const qrDataUrl = await generateQRCode(digitalUrl);

      // Build metadata
      const metadata: ReceiptMetadata = {
        cafeName: config.cafeName,
        cafeAddress: config.cafeAddress,
        cafePhone: config.cafePhone,
        timestamp: timestampString,
        receiptNumber: receiptNumber,
        customMessage: config.customMessage,
        homeSubtitleBottom: config.homeSubtitleBottom,
        qrCodeUrl: qrDataUrl,
      };
      
      this.activeSession.metadata = metadata;

      // Render theme selector UI
      this.renderThemeSelector(template.id);

      // 4. Render template HTML
      const templateHtml = template.render(this.activeSession.ditheredPhotos, metadata, this.activeSession);

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
      const config = loadKioskConfig();
      if (config.enableQrCode !== false) {
        // 1. Kick off background upload before transitioning
        this.activeSession.uploadPromise = (async () => {
          try {
            // Generate high quality B&W (grayscale, non-dithered) and Color receipt images
            const bwBlob = await generateReceiptBlob(this.activeSession, 'bw');
            const colorBlob = await generateReceiptBlob(this.activeSession, 'color');
            
            this.activeSession.bwBlob = bwBlob;
            this.activeSession.colorBlob = colorBlob;
            
            const shareId = await uploadReceiptPhotos(bwBlob, colorBlob, this.activeSession.shareId);
            
            const baseUrl = 'https://photoreceipt.stoodioph.com';
            const hybridUrl = `${baseUrl}/?id=${shareId}`;
            const qrDataUrl = await generateQRCode(hybridUrl);
            
            if (this.activeSession.metadata) {
              this.activeSession.metadata.qrCodeUrl = qrDataUrl;
            }

            // Proactively update any rendered HTML preview or print containers with the correct QR code image
            const previewQrImages = document.querySelectorAll('.receipt-qr-image');
            previewQrImages.forEach((img) => {
              (img as HTMLImageElement).src = qrDataUrl;
            });

            return qrDataUrl;
          } catch (err) {
            console.error('Failed to upload receipts in background:', err);
            return null; // Fallback to local default QR code url on error
          }
        })();
      } else {
        this.activeSession.uploadPromise = undefined;
      }

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

  private renderThemeSelector(templateId: string): void {
    const wrapper = this.element.querySelector('#theme-selector-wrapper');
    if (!wrapper) return;

    const themes = THEMES_BY_TEMPLATE[templateId] || [];
    if (themes.length <= 1) {
      wrapper.innerHTML = '';
      wrapper.classList.add('hidden');
      return;
    }

    wrapper.classList.remove('hidden');
    wrapper.innerHTML = `
      <div class="theme-selector-container">
        <span class="theme-selector-label">✨ Choose Frame Template</span>
        <div class="theme-options-list">
          ${themes.map(theme => `
            <button class="theme-option-item ${theme.id === (this.activeSession.selectedThemeId || 'default') ? 'active' : ''}" data-theme-id="${theme.id}">
              <span class="theme-option-indicator"></span>
              <span class="theme-option-name">${theme.name}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    // Add click listeners to theme option items
    const optionBtns = wrapper.querySelectorAll('.theme-option-item');
    optionBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLButtonElement;
        const themeId = target.getAttribute('data-theme-id');
        if (!themeId) return;

        // Play beep sound
        audioManager.playBeep();

        // Update session theme id
        this.activeSession.selectedThemeId = themeId;

        // Update active class on buttons
        optionBtns.forEach(b => b.classList.remove('active'));
        target.classList.add('active');

        // Re-render preview HTML
        this.updateReceiptPreview();
      });
    });
  }

  private updateReceiptPreview(): void {
    const template = getTemplateById(this.activeSession.selectedTemplateId || '');
    const contentTarget = this.element.querySelector('#receipt-content-target');
    if (template && contentTarget && this.activeSession.metadata) {
      const templateHtml = template.render(
        this.activeSession.ditheredPhotos || [],
        this.activeSession.metadata,
        this.activeSession
      );
      contentTarget.innerHTML = templateHtml;
    }
  }
}

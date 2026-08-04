import { BaseView } from './base';
import type { AppSession } from '../types';
import { TEMPLATES } from '../templates';
import { loadKioskConfig } from '../services/config';
import { audioManager } from '../services/audio';

export class OrderSummaryView extends BaseView {
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
    const config = loadKioskConfig();
    const logoUrl = config.logoDataUrl || config.logoScreenDataUrl;
    const logoHtml = logoUrl 
      ? `<img src="${logoUrl}" class="thank-you-logo" />` 
      : `<div class="thank-you-logo-placeholder">☕️</div>`;

    this.element.innerHTML = `
      <div class="template-screen-content">
        <div class="kiosk-app-bar">
          <button class="kiosk-back-btn" id="btn-summary-back" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            <span>BACK</span>
          </button>
          <div class="kiosk-app-bar-titles">
            <h2 class="kiosk-screen-title">Order Summary</h2>
            <p class="kiosk-screen-subtitle">Please verify your selection before capturing</p>
          </div>
        </div>

        <div class="order-summary-printer-container">
          <!-- simulated 3D printer hardware slot -->
          <div class="printer-hardware-mouth">
            <div class="printer-hardware-slot"></div>
          </div>
          
          <div class="printer-paper-clipper">
            <div class="order-summary-receipt">
              <!-- Circular cuts for receipt look -->
              <div class="receipt-cutout left"></div>
              <div class="receipt-cutout right"></div>

              ${logoHtml}
              <h3 class="receipt-cafe-name">${config.cafeName}</h3>
              <h4 class="receipt-order-title">ORDER SUMMARY</h4>
              
              <div class="thank-you-divider"></div>

              <!-- Selected Items Grid -->
              <div class="order-receipt-item-row">
                <div class="order-receipt-item-col">
                  <span class="order-receipt-item-title" id="summary-layout-name">-</span>
                  <span class="order-receipt-item-sub">Selected Layout</span>
                </div>
                <div class="order-receipt-item-price">—</div>
              </div>

              <div class="order-receipt-item-row">
                <div class="order-receipt-item-col">
                  <span class="order-receipt-item-title" id="summary-package-name">-</span>
                  <span class="order-receipt-item-sub">Selected Package</span>
                </div>
                <div class="order-receipt-item-price" id="summary-total-price-item">—</div>
              </div>

              <div class="order-receipt-item-row">
                <div class="order-receipt-item-col">
                  <span class="order-receipt-item-title" id="summary-prints-count">-</span>
                  <span class="order-receipt-item-sub">Copies Selected</span>
                </div>
                <div class="order-receipt-item-price">—</div>
              </div>

              <div class="thank-you-divider"></div>

              <!-- Total Pricing row -->
              <div class="order-receipt-total-row">
                <span>TOTAL:</span>
                <span id="summary-total-price" class="order-receipt-total-val">-</span>
              </div>

              <div class="thank-you-divider"></div>

              <div class="order-receipt-payment-info">
                <div class="payment-badge-pill">☕ CASHIER PAYMENT</div>
                <p style="margin-top: 6px;">Pay together with your café order. No activation code required!</p>
              </div>

              <!-- Scalloped bottom -->
              <div class="receipt-bottom-scallops"></div>
            </div>
          </div>
        </div>

        <div class="order-summary-footer">
          <button class="btn btn-primary btn-wide" id="btn-summary-start" type="button">⚡ START CAPTURE</button>
        </div>
      </div>
    `;

    this.setupEvents();
  }

  unmount(): void {}

  onEnter(): void {
    this.updateSummaryDetails();
  }

  private setupEvents(): void {
    const backBtn = this.element.querySelector('#btn-summary-back');
    backBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      audioManager.playBeep();
      this.navigateTo('package-selection');
    });

    const startBtn = this.element.querySelector('#btn-summary-start');
    startBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      audioManager.playBeep();
      this.navigateTo('camera-capture');
    });
  }

  private updateSummaryDetails(): void {
    const layoutNameEl = this.element.querySelector('#summary-layout-name');
    const packageNameEl = this.element.querySelector('#summary-package-name');
    const printsCountEl = this.element.querySelector('#summary-prints-count');
    const totalPriceEl = this.element.querySelector('#summary-total-price');
    const totalPriceItemEl = this.element.querySelector('#summary-total-price-item');

    if (!layoutNameEl || !packageNameEl || !printsCountEl || !totalPriceEl) return;

    const config = loadKioskConfig();
    const currency = config.currencySymbol || '₱';

    // Find Layout Name
    const templateId = this.activeSession.selectedTemplateId;
    const template = TEMPLATES.find(t => t.id === templateId);
    layoutNameEl.textContent = template ? template.name : 'Photo Strip Collage';

    // Find Print Package details
    const pkg = this.activeSession.selectedPackage;
    if (pkg) {
      packageNameEl.textContent = pkg.name;
      printsCountEl.textContent = `${pkg.printsCount} ${pkg.printsCount === 1 ? 'copy' : 'copies'}`;
      totalPriceEl.textContent = `${currency}${pkg.price.toFixed(2)}`;
      if (totalPriceItemEl) totalPriceItemEl.textContent = `${currency}${pkg.price.toFixed(2)}`;
    } else {
      // Fallback
      packageNameEl.textContent = 'Standard Package';
      printsCountEl.textContent = '1 copy';
      totalPriceEl.textContent = `${currency}30.00`;
      if (totalPriceItemEl) totalPriceItemEl.textContent = `${currency}30.00`;
    }
  }
}

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
    this.element.innerHTML = `
      <div class="template-screen-content">
        <div class="template-screen-header">
          <h2 class="template-choose-title">ORDER <span class="script-title">Summary</span></h2>
          <p style="margin-top: 8px; font-size: 16px; color: var(--text-secondary);">Please verify your selection before capturing.</p>
        </div>

        <div class="order-summary-card">
          <div class="summary-row">
            <span class="summary-label">Layout Selection:</span>
            <strong id="summary-layout-name" class="summary-val">-</strong>
          </div>
          <div class="summary-row">
            <span class="summary-label">Print Package:</span>
            <strong id="summary-package-name" class="summary-val">-</strong>
          </div>
          <div class="summary-row">
            <span class="summary-label">Copies to Print:</span>
            <strong id="summary-prints-count" class="summary-val">-</strong>
          </div>
          <div class="summary-row summary-total-row">
            <span>Total Amount:</span>
            <span id="summary-total-price" class="summary-total-price-val">-</span>
          </div>
          
          <div class="payment-notification-box">
            ☕ <strong>Cashier Payment</strong><br/>
            Please pay at the cashier together with your café order. No activation code or confirmation is needed!
          </div>
        </div>

        <div class="summary-actions-bar">
          <button class="btn btn-secondary" id="btn-summary-back" type="button">← CHANGE</button>
          <button class="btn btn-primary" id="btn-summary-start" type="button">⚡ START CAPTURE</button>
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
      printsCountEl.textContent = `${pkg.printsCount} copies`;
      totalPriceEl.textContent = `${currency}${pkg.price.toFixed(2)}`;
    } else {
      // Fallback
      packageNameEl.textContent = 'Standard Package';
      printsCountEl.textContent = '1 copy';
      totalPriceEl.textContent = `${currency}30.00`;
    }
  }
}

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
          <p style="margin-top: -10px; font-size: 14px; color: var(--text-secondary);">Please verify your selection before capturing.</p>
        </div>

        <div class="order-summary-card" style="
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid var(--border-primary);
          border-radius: 12px;
          padding: 30px;
          width: 100%;
          max-width: 500px;
          margin: 20px auto;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
          box-sizing: border-box;
        ">
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px dashed var(--border-primary); padding-bottom: 12px;">
            <span style="font-weight: 500;">Layout Selection:</span>
            <strong id="summary-layout-name" style="font-family: var(--font-ui); color: var(--text-primary);">-</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px dashed var(--border-primary); padding-bottom: 12px;">
            <span style="font-weight: 500;">Print Package:</span>
            <strong id="summary-package-name" style="font-family: var(--font-ui); color: var(--text-primary);">-</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 12px; border-bottom: 1px dashed var(--border-primary); padding-bottom: 12px;">
            <span style="font-weight: 500;">Copies to Print:</span>
            <strong id="summary-prints-count" style="font-family: var(--font-ui); color: var(--text-primary);">-</strong>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 20px; font-weight: 800; padding-top: 8px;">
            <span>Total Amount:</span>
            <span id="summary-total-price" style="color: var(--text-primary); font-family: var(--font-ui);">-</span>
          </div>
          
          <div class="payment-notification-box" style="
            background: rgba(var(--accent-color), 0.05);
            border: 1px solid var(--border-primary);
            border-radius: 8px;
            padding: 16px;
            margin-top: 24px;
            text-align: center;
            font-size: 13px;
            line-height: 1.5;
            color: var(--text-secondary);
          ">
            ☕ <strong>Cashier Payment</strong><br/>
            Please pay at the cashier together with your café order. No activation code or confirmation is needed!
          </div>
        </div>

        <div style="margin-top: 24px; display: flex; gap: 15px; width: 100%; max-width: 500px; margin-left: auto; margin-right: auto; box-sizing: border-box; padding: 0 10px;">
          <button class="btn btn-secondary" id="btn-summary-back" style="flex: 1; padding: 15px;" type="button">← CHANGE</button>
          <button class="btn btn-primary" id="btn-summary-start" style="flex: 2; padding: 15px; font-weight: 700;" type="button">⚡ START CAPTURE</button>
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

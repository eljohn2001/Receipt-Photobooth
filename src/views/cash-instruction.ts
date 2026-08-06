import { BaseView } from './base';
import type { AppSession } from '../types';
import { loadKioskConfig } from '../services/config';
import { audioManager } from '../services/audio';
import { hapticService } from '../services/haptics';

export class CashInstructionView extends BaseView {
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
    const currency = config.currencySymbol || '₱';
    const pkg = this.activeSession.selectedPackage;
    const pkgName = pkg ? pkg.name : 'Package';
    const price = pkg ? pkg.price : 50;

    this.element.innerHTML = `
      <div class="template-screen-content">
        <div class="kiosk-app-bar">
          <div class="kiosk-app-bar-titles">
            <h2 class="kiosk-screen-title">Pay at the Counter</h2>
            <p class="kiosk-screen-subtitle">Complete payment at the cashier register to receive your QR Code</p>
          </div>
        </div>

        <div class="cash-instruction-container">
          <div class="cash-instruction-card animate-pop-in">
            <div class="cash-icon-badge">🧾</div>
            
            <h3 class="cash-title">Cashier Payment Instructions</h3>
            
            <div class="cash-steps-list">
              <div class="cash-step-item">
                <span class="step-num">1</span>
                <div class="step-text">
                  <strong>Proceed to Cashier</strong>
                  <span>Pay <strong>${currency}${price.toFixed(2)}</strong> for <strong>${pkgName}</strong> at the counter register.</span>
                </div>
              </div>

              <div class="cash-step-item">
                <span class="step-num">2</span>
                <div class="step-text">
                  <strong>Receive Package QR Code</strong>
                  <span>The cashier will hand you your reusable physical <strong>Snapreceipt™ Package QR Code</strong>.</span>
                </div>
              </div>

              <div class="cash-step-item">
                <span class="step-num">3</span>
                <div class="step-text">
                  <strong>Scan QR Code at Kiosk</strong>
                  <span>Return to the booth and scan the Package QR Code using the camera scanner.</span>
                </div>
              </div>
            </div>

            <div class="cash-notice-box">
              <span class="notice-icon">💡</span>
              <p>Keep your Package QR Code handy! You will return it to the cashier after printing your photo strip.</p>
            </div>

            <button class="btn btn-primary btn-wide btn-cash-continue" id="btn-cash-continue" type="button">
              <span>SCAN PACKAGE QR CODE</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
            </button>
          </div>
        </div>

        <!-- Floating Bottom Back Navigation Pill -->
        <div class="kiosk-floating-bottom-bar">
          <button class="kiosk-floating-bottom-back" id="btn-cash-back" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            <span>Back to Payment Methods</span>
          </button>
        </div>
      </div>
    `;

    this.setupEvents();
  }

  unmount(): void {}

  onEnter(): void {
    this.mount();
  }

  private setupEvents(): void {
    const backBtn = this.element.querySelector('#btn-cash-back');
    backBtn?.addEventListener('click', () => {
      audioManager.playBeep();
      this.navigateTo('payment-method');
    });

    const continueBtn = this.element.querySelector('#btn-cash-continue');
    continueBtn?.addEventListener('click', () => {
      audioManager.playBeep();
      hapticService.impactMedium();
      this.navigateTo('qr-scanner');
    });
  }
}

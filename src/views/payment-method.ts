import { BaseView } from './base';
import type { AppSession } from '../types';
import { loadKioskConfig } from '../services/config';
import { audioManager } from '../services/audio';
import { hapticService } from '../services/haptics';
import { renderAnimatedCameraQrIcon, renderAnimatedPhoneQrIcon } from '../components/animated-icons';

export class PaymentMethodView extends BaseView {
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
      <div class="template-screen-content payment-method-screen-wrapper">
        <div class="kiosk-app-bar">
          <button class="kiosk-back-btn" id="btn-pm-back" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            <span>BACK</span>
          </button>
          <div class="kiosk-app-bar-titles">
            <h2 class="kiosk-screen-title">Select Payment Method</h2>
            <p class="kiosk-screen-subtitle">Choose how you would like to pay for your photo booth session</p>
          </div>
        </div>

        <div class="payment-method-centered-container">
          <div class="payment-method-grid">
            <!-- 💵 Cash Payment Option Card -->
            <div class="payment-method-card cash tilt-card ripple-container" id="pm-option-cash">
              <div class="pm-card-badge cash">HAVE PACKAGE QR</div>
              
              <div class="pm-icon-wrapper cash">
                ${renderAnimatedCameraQrIcon(40)}
              </div>

              <h3 class="pm-card-title">Pay Cash at Counter</h3>
              <p class="pm-card-desc">Pay at the café register and scan your cashier Package QR Code to unlock the booth.</p>
              
              <button type="button" class="btn-pm-cta cash">
                <span>📷 SCAN PACKAGE QR</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>

            <!-- 📱 Cashless Payment Option Card -->
            <div class="payment-method-card cashless tilt-card ripple-container" id="pm-option-cashless">
              <div class="pm-card-badge cashless">GCASH / ON-SCREEN</div>
              
              <div class="pm-icon-wrapper cashless">
                ${renderAnimatedPhoneQrIcon(40)}
              </div>

              <h3 class="pm-card-title">Pay Cashless (GCash)</h3>
              <p class="pm-card-desc">Choose layout & package on screen and verify payment using your GCash reference number.</p>
              
              <button type="button" class="btn-pm-cta cashless">
                <span>⚡ PROCEED TO LAYOUTS</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
              </button>
            </div>
          </div>
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
    const backBtn = this.element.querySelector('#btn-pm-back');
    backBtn?.addEventListener('click', () => {
      audioManager.playBeep();
      const config = loadKioskConfig();
      if (config.enableComfortCards !== false) {
        this.navigateTo('mode-selection');
      } else {
        this.navigateTo('idle');
      }
    });

    const cashBtn = this.element.querySelector('#pm-option-cash');
    cashBtn?.addEventListener('click', () => {
      audioManager.playBeep();
      hapticService.impactMedium();
      this.activeSession.paymentMethod = 'cash';
      this.navigateTo('cash-instruction');
    });

    const cashlessBtn = this.element.querySelector('#pm-option-cashless');
    cashlessBtn?.addEventListener('click', () => {
      audioManager.playBeep();
      hapticService.impactMedium();
      this.activeSession.paymentMethod = 'cashless';
      this.activeSession.isPackageLocked = false;
      this.navigateTo('template-selection');
    });
  }
}

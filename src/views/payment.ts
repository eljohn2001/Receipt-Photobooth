import { BaseView } from './base';
import type { AppSession } from '../types';
import { loadKioskConfig } from '../services/config';
import { audioManager } from '../services/audio';
import { verifyPaymentRefOnline } from '../services/payment';
import { showKioskPromptModal, showKioskAlertModal } from '../services/modal';

export class PaymentView extends BaseView {
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
    const pkgName = pkg ? pkg.name : 'Photo Receipt Strip';
    const totalAmount = pkg ? pkg.price : (config.sessionPrice || 30.0);
    const inclusionsText = pkg?.inclusions || 'Thermal Photo Strip Print + Digital Softcopy';

    // Priority: Package-specific QR Code -> Global payment QR Code
    const activeQrUrl = pkg?.qrCodeDataUrl || config.paymentQrCodeDataUrl;

    const qrCodeHtml = activeQrUrl
      ? `<img src="${activeQrUrl}" class="payment-screen-qr-img" alt="${pkgName} Payment QR Code" />`
      : `
        <div class="payment-qr-placeholder">
          <span style="font-size: 48px;">📱</span>
          <span style="font-size: 13px; font-weight: 700; margin-top: 8px;">SCAN ${pkgName.toUpperCase()} QR</span>
        </div>
      `;

    const accountDetailsHtml = (config.paymentAccountName || config.paymentAccountNumber)
      ? `<div class="payment-account-badge">
          ${config.paymentAccountName ? `<span class="account-name">${config.paymentAccountName}</span>` : ''}
          ${config.paymentAccountNumber ? `<span class="account-number">${config.paymentAccountNumber}</span>` : ''}
         </div>`
      : '';

    const instructionsText = 'Please scan this QR Code using GCash or your preferred payment app and complete your payment before proceeding.';

    this.element.innerHTML = `
      <div class="template-screen-content">
        <div class="kiosk-app-bar">
          <button class="kiosk-back-btn" id="btn-payment-back" type="button">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
            <span>BACK</span>
          </button>
          <div class="kiosk-app-bar-titles">
            <h2 class="kiosk-screen-title">Scan to Pay</h2>
            <p class="kiosk-screen-subtitle">Scan ${pkgName} QR code & enter last 4 digits of your GCash mobile number</p>
          </div>
        </div>

        <div class="payment-screen-card-container">
          <div class="payment-screen-card">
            
            <div class="payment-amount-header">
              <span class="payment-amount-label">${pkgName.toUpperCase()}</span>
              <span class="payment-amount-val">${currency}${totalAmount.toFixed(2)}</span>
              <div style="font-size: 11px; font-weight: 700; color: rgba(255,255,255,0.85); margin-top: 4px;">${inclusionsText}</div>
            </div>

            <div class="payment-qr-display-box">
              ${qrCodeHtml}
              ${accountDetailsHtml}
            </div>

            <p class="payment-instructions-text">${instructionsText}</p>

            <div class="payment-ref-field-group">
              <label class="payment-ref-field-label">Your GCash Mobile No. (Last 4 Digits)</label>
              
              <!-- 4-Digit PIN Slot Display -->
              <div class="payment-pin-display" id="payment-pin-display">
                <div class="payment-pin-digit active" id="pin-slot-0">-</div>
                <div class="payment-pin-digit" id="pin-slot-1">-</div>
                <div class="payment-pin-digit" id="pin-slot-2">-</div>
                <div class="payment-pin-digit" id="pin-slot-3">-</div>
              </div>
            </div>

            <!-- Custom 3x4 Touch Numeric Keypad -->
            <div class="kiosk-keypad-grid" id="kiosk-keypad">
              <button type="button" class="keypad-btn" data-key="1">1</button>
              <button type="button" class="keypad-btn" data-key="2">2</button>
              <button type="button" class="keypad-btn" data-key="3">3</button>
              <button type="button" class="keypad-btn" data-key="4">4</button>
              <button type="button" class="keypad-btn" data-key="5">5</button>
              <button type="button" class="keypad-btn" data-key="6">6</button>
              <button type="button" class="keypad-btn" data-key="7">7</button>
              <button type="button" class="keypad-btn" data-key="8">8</button>
              <button type="button" class="keypad-btn" data-key="9">9</button>
              <button type="button" class="keypad-btn keypad-btn-action" data-key="delete">⌫</button>
              <button type="button" class="keypad-btn" data-key="0">0</button>
              <button type="button" class="keypad-btn keypad-btn-action" data-key="clear">CLEAR</button>
            </div>

            <div id="payment-page-error-banner" class="paywall-error-banner hidden"></div>

            <button class="btn btn-primary btn-wide" id="btn-payment-verify-start" type="button" style="margin-top: 10px;">
              ⚡ VERIFY & START CAPTURE
            </button>

            <button type="button" class="paywall-staff-override-btn" id="btn-payment-staff-override" style="margin-top: 10px;">
              🔑 Staff PIN Override
            </button>

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
    const backBtn = this.element.querySelector('#btn-payment-back');
    backBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      audioManager.playBeep();
      this.navigateTo('order-summary');
    });

    const verifyBtn = this.element.querySelector('#btn-payment-verify-start') as HTMLButtonElement;
    const errorBanner = this.element.querySelector('#payment-page-error-banner') as HTMLElement;
    const staffOverrideBtn = this.element.querySelector('#btn-payment-staff-override');
    const keypad = this.element.querySelector('#kiosk-keypad');

    const config = loadKioskConfig();

    // 4-Digit State
    let enteredDigits: string[] = [];

    const updatePinDisplay = () => {
      for (let i = 0; i < 4; i++) {
        const slot = this.element.querySelector(`#pin-slot-${i}`) as HTMLElement;
        if (slot) {
          if (i < enteredDigits.length) {
            slot.textContent = enteredDigits[i];
            slot.classList.add('filled');
            slot.classList.remove('active');
          } else if (i === enteredDigits.length) {
            slot.textContent = '-';
            slot.classList.remove('filled');
            slot.classList.add('active');
          } else {
            slot.textContent = '-';
            slot.classList.remove('filled', 'active');
          }
        }
      }
    };

    const triggerVerification = async () => {
      const refValue = enteredDigits.join('');

      if (!refValue || refValue.length !== 4) {
        if (errorBanner) {
          errorBanner.textContent = 'Please enter exactly the last 4 digits of your GCash mobile number.';
          errorBanner.classList.remove('hidden');
        }
        return;
      }

      if (errorBanner) errorBanner.classList.add('hidden');
      if (verifyBtn) {
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'VERIFYING PAYMENT...';
      }

      const pkg = this.activeSession.selectedPackage;
      const expectedAmount = pkg ? pkg.price : (config.sessionPrice || 30.0);

      const result = await verifyPaymentRefOnline(refValue, expectedAmount);

      if (result.success) {
        this.activeSession.isPaid = true;
        this.activeSession.paymentRefNumber = result.refNo || refValue;
        audioManager.playBeep();
        this.navigateTo('camera-capture');
      } else {
        if (verifyBtn) {
          verifyBtn.disabled = false;
          verifyBtn.textContent = '⚡ VERIFY & START CAPTURE';
        }

        if (errorBanner) {
          errorBanner.textContent = result.error || 'Reference Number verification failed. Please check your GCash receipt.';
          errorBanner.classList.remove('hidden');
        }
      }
    };

    // Custom In-App Keypad Touch Event Listener
    keypad?.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('.keypad-btn') as HTMLButtonElement;
      if (!target) return;

      e.stopPropagation();
      audioManager.playBeep();

      const key = target.getAttribute('data-key');

      if (key === 'delete') {
        if (enteredDigits.length > 0) {
          enteredDigits.pop();
          updatePinDisplay();
        }
      } else if (key === 'clear') {
        enteredDigits = [];
        updatePinDisplay();
      } else if (key && /^[0-9]$/.test(key)) {
        if (enteredDigits.length < 4) {
          enteredDigits.push(key);
          updatePinDisplay();

          // Auto-trigger verification upon entering 4th digit
          if (enteredDigits.length === 4) {
            setTimeout(() => {
              triggerVerification();
            }, 250);
          }
        }
      }
    });

    verifyBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      audioManager.playBeep();
      triggerVerification();
    });

    // Staff PIN Bypass Override (Custom In-App Glass Modal)
    staffOverrideBtn?.addEventListener('click', async (e) => {
      e.stopPropagation();
      const enteredPin = await showKioskPromptModal({
        title: "Staff Override",
        message: "Enter Admin PIN to bypass paywall verification",
        placeholder: "••••",
        confirmText: "AUTHORIZE"
      });

      if (enteredPin === null) return;

      const adminPin = config.adminPin || '1234';
      if (enteredPin.trim() === adminPin) {
        this.activeSession.isPaid = true;
        this.activeSession.paymentRefNumber = 'STAFF-BYPASS';
        audioManager.playBeep();
        this.navigateTo('camera-capture');
      } else {
        await showKioskAlertModal({
          title: "Access Denied",
          message: "Incorrect Admin PIN entered. Staff override failed.",
          icon: "❌"
        });
      }
    });
  }
}

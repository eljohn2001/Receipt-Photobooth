/**
 * In-App Custom Glassmorphism Kiosk Modals
 * Replaces native browser alert() and prompt() popups
 */

export function showKioskAlertModal(options: {
  title: string;
  message: string;
  icon?: string;
  buttonText?: string;
}): Promise<void> {
  return new Promise((resolve) => {
    const existing = document.getElementById('kiosk-alert-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'kiosk-alert-overlay';
    overlay.className = 'kiosk-modal-overlay';

    const iconHtml = options.icon ? `<div class="kiosk-modal-icon-badge">${options.icon}</div>` : '';
    const btnLabel = options.buttonText || 'UNDERSTOOD';

    overlay.innerHTML = `
      <div class="kiosk-modal-card">
        ${iconHtml}
        <h3 class="kiosk-modal-title">${options.title}</h3>
        <p class="kiosk-modal-desc">${options.message}</p>
        <div class="kiosk-modal-actions">
          <button type="button" class="btn btn-primary" id="kiosk-modal-confirm-btn">${btnLabel}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const btn = overlay.querySelector('#kiosk-modal-confirm-btn');
    btn?.addEventListener('click', () => {
      overlay.remove();
      resolve();
    });
  });
}

export function showKioskPromptModal(options: {
  title: string;
  message: string;
  placeholder?: string;
  confirmText?: string;
  cancelText?: string;
}): Promise<string | null> {
  return new Promise((resolve) => {
    const existing = document.getElementById('kiosk-prompt-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'kiosk-prompt-overlay';
    overlay.className = 'kiosk-modal-overlay';

    const confirmLabel = options.confirmText || 'SUBMIT';
    const cancelLabel = options.cancelText || 'CANCEL';
    const placeholder = options.placeholder || '';

    overlay.innerHTML = `
      <div class="kiosk-modal-card">
        <div class="kiosk-modal-icon-badge">🔑</div>
        <h3 class="kiosk-modal-title">${options.title}</h3>
        <p class="kiosk-modal-desc">${options.message}</p>
        <input type="password" class="kiosk-modal-input" id="kiosk-prompt-input" placeholder="${placeholder}" autocomplete="off" />
        <div class="kiosk-modal-actions">
          <button type="button" class="btn btn-secondary" id="kiosk-prompt-cancel-btn">${cancelLabel}</button>
          <button type="button" class="btn btn-primary" id="kiosk-prompt-confirm-btn">${confirmLabel}</button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = overlay.querySelector('#kiosk-prompt-input') as HTMLInputElement;
    const confirmBtn = overlay.querySelector('#kiosk-prompt-confirm-btn');
    const cancelBtn = overlay.querySelector('#kiosk-prompt-cancel-btn');

    setTimeout(() => input?.focus(), 100);

    confirmBtn?.addEventListener('click', () => {
      const val = input ? input.value.trim() : '';
      overlay.remove();
      resolve(val);
    });

    cancelBtn?.addEventListener('click', () => {
      overlay.remove();
      resolve(null);
    });

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const val = input.value.trim();
        overlay.remove();
        resolve(val);
      }
    });
  });
}

export function showKioskOnboardingWizard(): Promise<void> {
  return new Promise((resolve) => {
    const existing = document.getElementById('kiosk-wizard-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'kiosk-wizard-overlay';
    overlay.className = 'kiosk-modal-overlay';

    const steps = [
      {
        icon: '📐',
        step: 'STEP 1 OF 3',
        title: 'Choose Layout & Copies',
        desc: 'Select your preferred B&W photo grid or solo card layout and choose print copies.'
      },
      {
        icon: '📸',
        step: 'STEP 2 OF 3',
        title: 'Pay & Auto Countdown',
        desc: 'Scan QR to pay. Camera countdown (3... 2... 1...) starts automatically after payment!'
      },
      {
        icon: '🖨️',
        step: 'STEP 3 OF 3',
        title: 'Customize & Collect',
        desc: 'Add stickers or dither filters, then collect your physical thermal receipt memory!'
      }
    ];

    let currentStep = 0;

    function renderWizardStep(stepIdx: number) {
      const data = steps[stepIdx];
      const isLast = stepIdx === steps.length - 1;

      overlay.innerHTML = `
        <div class="wizard-modal-card">
          <div class="wizard-step-badge">${data.step}</div>
          <div class="kiosk-modal-icon-badge">${data.icon}</div>
          <h3 class="kiosk-modal-title">${data.title}</h3>
          <p class="kiosk-modal-desc">${data.desc}</p>
          <div class="wizard-step-dots">
            <div class="wizard-dot ${stepIdx === 0 ? 'active' : ''}"></div>
            <div class="wizard-dot ${stepIdx === 1 ? 'active' : ''}"></div>
            <div class="wizard-dot ${stepIdx === 2 ? 'active' : ''}"></div>
          </div>
          <div class="kiosk-modal-actions">
            <button type="button" class="btn btn-primary" id="wizard-next-btn">
              ${isLast ? "LET'S SNAP! 🚀" : "NEXT STEP ➔"}
            </button>
          </div>
        </div>
      `;

      const nextBtn = overlay.querySelector('#wizard-next-btn');
      nextBtn?.addEventListener('click', () => {
        if (isLast) {
          overlay.remove();
          resolve();
        } else {
          currentStep++;
          renderWizardStep(currentStep);
        }
      });
    }

    document.body.appendChild(overlay);
    renderWizardStep(currentStep);
  });
}

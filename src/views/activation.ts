import { BaseView } from './base';
import { activateLicense, getDeviceUUID } from '../services/license';
import { audioManager } from '../services/audio';

export class ActivationView extends BaseView {
  private submitHandler: ((e: Event) => void) | null = null;

  mount(): void {
    this.element.innerHTML = `
      <div class="activation-screen-content">
        <div class="activation-header">
          <h1 class="brand-title">SNAPCEIPT™</h1>
          <p class="brand-subtitle">Receipt Photo Booth Vending Software</p>
        </div>

        <div class="activation-card" id="activation-card">
          <div class="activation-card-header">
            <h2 class="activation-title">Kiosk Activation</h2>
            <p class="activation-subtitle">Enter your license activation key to authorize this device.</p>
          </div>

          <form id="activation-form" class="activation-form">
            <div class="form-group">
              <label for="input-activation-key">License Activation Key</label>
              <input 
                type="text" 
                id="input-activation-key" 
                placeholder="SNAP-XXXX-XXXX-XXXX" 
                required 
                autocomplete="off" 
                spellcheck="false"
                class="activation-input"
              />
            </div>

            <div class="activation-status-message" id="activation-status-msg" style="display: none;"></div>

            <button type="submit" class="btn btn-primary btn-full" id="btn-activate-submit">
              ⚡ ACTIVATE DEVICE
            </button>
          </form>
        </div>

        <div class="device-info-footer">
          Device Hardware ID: <code id="display-device-uuid">Loading UUID...</code>
        </div>
      </div>
    `;

    this.setupEvents();
  }

  unmount(): void {
    const form = this.element.querySelector('#activation-form');
    if (form && this.submitHandler) {
      form.removeEventListener('submit', this.submitHandler);
    }
  }

  async onEnter(): Promise<void> {
    // Reset form states
    const input = this.element.querySelector('#input-activation-key') as HTMLInputElement;
    if (input) {
      input.value = '';
      input.disabled = false;
    }

    const submitBtn = this.element.querySelector('#btn-activate-submit') as HTMLButtonElement;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = '⚡ ACTIVATE DEVICE';
    }

    const statusMsg = this.element.querySelector('.activation-status-message') as HTMLElement;
    if (statusMsg) {
      statusMsg.style.display = 'none';
      statusMsg.className = 'activation-status-message';
      statusMsg.textContent = '';
    }

    const card = this.element.querySelector('#activation-card') as HTMLElement;
    if (card) {
      card.classList.remove('shake-error');
    }

    // Load and display device UUID
    const uuidDisplay = this.element.querySelector('#display-device-uuid');
    if (uuidDisplay) {
      try {
        const uuid = await getDeviceUUID();
        uuidDisplay.textContent = uuid;
      } catch (err) {
        uuidDisplay.textContent = 'Error fetching device ID';
      }
    }
  }

  private setupEvents(): void {
    const form = this.element.querySelector('#activation-form');
    const input = this.element.querySelector('#input-activation-key') as HTMLInputElement;
    const submitBtn = this.element.querySelector('#btn-activate-submit') as HTMLButtonElement;
    const statusMsg = this.element.querySelector('.activation-status-message') as HTMLElement;
    const card = this.element.querySelector('#activation-card') as HTMLElement;

    // Help format the key as the user types (capitalize and format hyphens if useful, or just uppercase)
    input?.addEventListener('input', () => {
      let val = input.value.toUpperCase().replace(/[^A-Z0-9-]/g, '');
      input.value = val;
    });

    this.submitHandler = async (e: Event) => {
      e.preventDefault();
      if (!input || !submitBtn || !statusMsg) return;

      const key = input.value.trim();
      if (!key) return;

      // 1. Play UI sound
      audioManager.playBeep();

      // 2. Set UI loading state
      input.disabled = true;
      submitBtn.disabled = true;
      submitBtn.textContent = '⏳ VERIFYING LICENSING...';

      statusMsg.style.display = 'block';
      statusMsg.className = 'activation-status-message status-loading';
      statusMsg.innerHTML = `⏳ Connecting to authorization server...`;
      card.classList.remove('shake-error');

      // 3. Trigger activation
      const result = await activateLicense(key);

      if (result.success) {
        statusMsg.className = 'activation-status-message status-success';
        statusMsg.innerHTML = `✓ Device Activated Successfully! Launching booth...`;
        submitBtn.textContent = '✓ ACTIVATED';
        
        // Success feedback
        audioManager.playPaperTear(); // nice tactile audio feedback

        // Wait a second for visual transition, then route to attract screen
        setTimeout(() => {
          this.navigateTo('idle');
        }, 1500);
      } else {
        // Play error sound if available
        audioManager.playBeep(); 

        // Show error message
        statusMsg.className = 'activation-status-message status-error';
        statusMsg.innerHTML = `❌ ${result.error || 'Activation failed.'}`;
        
        // Shake card visual effect
        card.classList.add('shake-error');
        setTimeout(() => {
          card.classList.remove('shake-error');
        }, 600);

        // Reset button
        input.disabled = false;
        submitBtn.disabled = false;
        submitBtn.textContent = '⚡ ACTIVATE DEVICE';
      }
    };

    form?.addEventListener('submit', this.submitHandler);
  }
}

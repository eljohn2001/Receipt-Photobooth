import type { RemoteSettings } from '../types';
import { Icons } from './Icons';

export function renderSettingsView(settings: RemoteSettings): string {
  const syncPayloadJson = JSON.stringify({
    timestamp: new Date().toISOString(),
    pricing_per_session: settings.pricingPerSession,
    profit_share_percent: settings.profitSharePercent,
    cafe_branding: {
      name: settings.cafeName,
      address: settings.cafeAddress,
      phone: settings.cafePhone,
      social_tag: settings.socialTag,
      receipt_footer: settings.customMessage
    },
    ui_customization: {
      welcome_msg: settings.welcomeMsg,
      accent_color: settings.accentColor,
      enable_stickers: settings.enableStickers,
      enable_paywall: settings.enablePaywall,
      camera_filter_bw: settings.cameraFilterBw
    }
  }, null, 2);

  return `
    <div class="settings-view">
      <div class="page-header">
        <div class="page-title-group">
          <h1>Remote Booth Settings & Branding</h1>
          <p>Configure pricing, receipt footers, welcome messages, and brand styling for your remote booths.</p>
        </div>
        <div class="page-actions">
          <button class="btn-portal btn-portal-primary" id="btn-save-remote-settings">
            Save & Push to Booths
          </button>
        </div>
      </div>

      <div class="settings-grid-layout">
        <div class="card-panel">
          <h2 style="font-size: 15px; font-weight: 700; margin-bottom: 16px; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
            <span style="color: var(--accent-primary); display: inline-flex;">${Icons.settings(16)}</span>
            <span>Business & Receipt Information</span>
          </h2>

          <div class="form-grid">
            <div class="form-group">
              <label>Café / Venue Name</label>
              <input type="text" id="setting-cafe-name" class="form-control" value="${settings.cafeName}" />
            </div>

            <div class="form-group">
              <label>Instagram / Social Tag</label>
              <input type="text" id="setting-social-tag" class="form-control" value="${settings.socialTag}" />
            </div>

            <div class="form-group full">
              <label>Location Address</label>
              <input type="text" id="setting-cafe-address" class="form-control" value="${settings.cafeAddress}" />
            </div>

            <div class="form-group">
              <label>Session Base Price (₱)</label>
              <input type="number" id="setting-session-price" class="form-control" value="${settings.pricingPerSession}" />
            </div>

            <div class="form-group">
              <label>Partner Revenue Share (%)</label>
              <input type="number" id="setting-profit-share" class="form-control" value="${100 - settings.profitSharePercent}" disabled />
            </div>

            <div class="form-group full">
              <label>Receipt Custom Footer Message</label>
              <textarea id="setting-custom-msg" class="form-control" rows="3">${settings.customMessage}</textarea>
            </div>

            <div class="form-group full">
              <label>Idle Welcome Screen Banner Message</label>
              <input type="text" id="setting-welcome-msg" class="form-control" value="${settings.welcomeMsg}" />
            </div>
          </div>

          <h2 style="font-size: 15px; font-weight: 700; margin: 24px 0 16px; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
            <span style="color: var(--accent-primary); display: inline-flex;">${Icons.activity(16)}</span>
            <span>Interactive Features & Toggles</span>
          </h2>

          <div style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-dark-card); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div>
                <div style="font-weight: 600; font-size: 13.5px; color: var(--text-primary);">Enable Scan-to-Pay Paywall</div>
                <div style="font-size: 11.5px; color: var(--text-tertiary);">Require customer GCash / E-wallet payment scan before camera capture</div>
              </div>
              <input type="checkbox" id="setting-enable-paywall" ${settings.enablePaywall ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-primary);" />
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-dark-card); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div>
                <div style="font-weight: 600; font-size: 13.5px; color: var(--text-primary);">Interactive Digital Emoji Stickers</div>
                <div style="font-size: 11.5px; color: var(--text-tertiary);">Allow users to decorate photos on-screen before printing</div>
              </div>
              <input type="checkbox" id="setting-enable-stickers" ${settings.enableStickers ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-primary);" />
            </div>

            <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-dark-card); padding: 12px 16px; border-radius: var(--radius-md); border: 1px solid var(--border-subtle);">
              <div>
                <div style="font-weight: 600; font-size: 13.5px; color: var(--text-primary);">Grayscale B&W Camera Mode</div>
                <div style="font-size: 11.5px; color: var(--text-tertiary);">Force live webcam preview and captured photos into monochrome</div>
              </div>
              <input type="checkbox" id="setting-camera-bw" ${settings.cameraFilterBw ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--accent-primary);" />
            </div>
          </div>
        </div>

        <div class="card-panel">
          <h2 style="font-size: 15px; font-weight: 700; margin-bottom: 12px; color: var(--text-primary);">Sync Payload Inspector</h2>
          <p style="font-size: 12px; color: var(--text-tertiary); margin-bottom: 16px;">This JSON payload automatically syncs down to physical booths on next heartbeat update.</p>

          <pre style="background: var(--bg-dark-base); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px; font-family: var(--font-mono); font-size: 11.5px; color: var(--text-secondary); overflow-x: auto; max-height: 480px;">${syncPayloadJson}</pre>
        </div>
      </div>
    </div>
  `;
}

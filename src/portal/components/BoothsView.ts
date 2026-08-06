import type { Booth } from '../types';
import { renderEmptyState } from './EmptyState';
import { Icons } from './Icons';

export function renderBoothsView(booths: Booth[], selectedBoothId?: string): string {
  if (booths.length === 0) {
    return `
      <div class="booths-view">
        <div class="page-header">
          <div class="page-title-group">
            <h1>Booth Fleet Management</h1>
            <p>Monitor status, paper levels, and diagnostic telemetry across all your location branches.</p>
          </div>
          <div class="page-actions">
            <button class="btn-portal btn-portal-primary" id="btn-open-add-booth-modal">
              ${Icons.plus(14)} Add New Booth Branch
            </button>
          </div>
        </div>
        ${renderEmptyState(
          '🏪',
          'No Booth Branches Registered',
          'No photobooths are currently registered under this location branch. Register your first physical kiosk to begin live telemetry tracking.',
          'Register First Booth Branch',
          'btn-open-add-booth-modal-empty'
        )}
      </div>
    `;
  }

  const selectedBooth = booths.find(b => b.id === selectedBoothId);

  const boothCardsHtml = booths.map(b => {
    const isOnline = b.status === 'online';
    const isPending = b.status === 'pending_activation';
    const paperPct = b.telemetry.paperRemainingPercent;
    const paperClass = paperPct > 40 ? 'success' : (paperPct > 15 ? 'warning' : 'danger');

    let statusPillHtml = '';
    if (isOnline) {
      statusPillHtml = `<span class="status-pill online"><span class="pulse"></span> Online</span>`;
    } else if (isPending) {
      statusPillHtml = `<span class="status-pill" style="background: rgba(245, 158, 11, 0.12); color: var(--color-warning);"><span class="dot" style="background: var(--color-warning);"></span> Pending Pairing</span>`;
    } else {
      statusPillHtml = `<span class="status-pill offline"><span class="dot"></span> Offline</span>`;
    }

    let modelBadgeText = '';
    if (b.isFreeEventMode) {
      modelBadgeText = '🎉 Free Event Mode (₱0)';
    } else if (b.businessModel === 'flat_rental') {
      modelBadgeText = `₱${b.pricingPerSession} (100% Client Revenue)`;
    } else {
      modelBadgeText = `₱${b.pricingPerSession} (${b.profitSharePercent}% Partner Share)`;
    }

    return `
      <div class="booth-card" data-booth-id="${b.id}">
        <div class="booth-card-header">
          <div>
            <div class="booth-name">${b.name}</div>
            <div class="booth-location" style="display: flex; align-items: center; gap: 4px; margin-top: 2px;">
              <span style="color: var(--accent-primary); display: inline-flex; align-items: center;">${Icons.locationPin(12)}</span>
              <span>${b.location}</span>
            </div>
          </div>
          ${statusPillHtml}
        </div>

        <div style="font-size: 11px; font-weight: 700; color: var(--accent-primary); margin-bottom: 10px;">
          ${modelBadgeText}
        </div>

        <div class="booth-stats-row">
          <div class="booth-stat-item">
            <span class="label">Today Sessions</span>
            <span class="val">${b.todaySessions}</span>
          </div>
          <div class="booth-stat-item">
            <span class="label">Today Revenue</span>
            <span class="val">₱${b.todayRevenue.toLocaleString()}</span>
          </div>
        </div>

        <div>
          <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 4px;">
            <span style="color: var(--text-tertiary);">Paper Roll Level:</span>
            <span style="font-weight: 700; color: var(--text-primary); font-family: var(--font-mono);">${b.paperPrintsRemaining} / ${b.paperMaxPrints} prints (${paperPct}%)</span>
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar-fill ${paperClass}" style="width: ${paperPct}%;"></div>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 14px; padding-top: 10px; border-top: 1px dashed var(--border-subtle); font-size: 11.5px; color: var(--text-tertiary);">
          <span>Sync: ${isPending ? 'Pending Pairing' : new Date(b.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span style="color: var(--accent-primary); font-weight: 700;">Inspect Booth Details →</span>
        </div>
      </div>
    `;
  }).join('');

  let modalHtml = '';
  if (selectedBooth) {
    const t = selectedBooth.telemetry;
    const isPending = selectedBooth.status === 'pending_activation';
    const isOnline = selectedBooth.status === 'online';

    let statusPillHtml = '';
    if (isOnline) {
      statusPillHtml = `<span class="status-pill online"><span class="pulse"></span> Online</span>`;
    } else if (isPending) {
      statusPillHtml = `<span class="status-pill" style="background: rgba(245, 158, 11, 0.12); color: var(--color-warning);"><span class="dot" style="background: var(--color-warning);"></span> Pending Pairing</span>`;
    } else {
      statusPillHtml = `<span class="status-pill offline"><span class="dot"></span> Offline</span>`;
    }

    let modelText = '';
    if (selectedBooth.isFreeEventMode) {
      modelText = 'Free Unlimited Event Mode (₱0 / 100% Client Share)';
    } else if (selectedBooth.businessModel === 'flat_rental') {
      modelText = `₱${selectedBooth.pricingPerSession} / 100% Client Share (Flat Rental)`;
    } else {
      modelText = `₱${selectedBooth.pricingPerSession} / ${selectedBooth.profitSharePercent}% Partner Share (Profit Split)`;
    }

    modalHtml = `
      <div class="portal-modal-overlay open" id="booth-detail-modal">
        <div class="portal-modal-content">
          <div class="sheet-drag-handle"></div>

          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 16px;">
            <div>
              <div style="display: flex; align-items: center; gap: 10px;">
                <h2 style="font-size: 20px; font-weight: 700;">${selectedBooth.name}</h2>
                ${statusPillHtml}
              </div>
              <p style="font-size: 12.5px; color: var(--text-secondary); margin-top: 4px; display: flex; align-items: center; gap: 4px;">
                ${Icons.locationPin(12)} ${selectedBooth.location}
              </p>
            </div>
            <button class="btn-portal btn-portal-secondary btn-portal-sm" id="btn-close-booth-modal">✕ Close</button>
          </div>

          ${isPending ? `
            <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid var(--color-warning); color: var(--color-warning); padding: 14px 16px; border-radius: var(--radius-md); font-size: 12.5px; font-weight: 600; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 10px; flex: 1;">
                <span style="font-size: 18px; display: inline-flex;">${Icons.key(18)}</span>
                <div>
                  <div style="font-weight: 700;">Awaiting Kiosk Activation</div>
                  <div style="font-size: 11.5px; font-weight: 400; opacity: 0.9; margin-top: 2px;">
                    Enter activation key on tablet app, or click right to confirm tablet pairing.
                  </div>
                </div>
              </div>
              <button class="btn-portal btn-portal-primary btn-portal-sm" id="btn-force-activate-booth" data-booth-id="${selectedBooth.id}" style="background: var(--color-warning); border-color: var(--color-warning); color: #000; font-weight: 700;">
                ✓ Confirm Tablet Activated
              </button>
            </div>
          ` : ''}

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 24px;" class="form-grid">
            <div style="background: var(--bg-dark-base); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px;">
              <span style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 700;">Camera Sensor</span>
              <div style="font-weight: 700; font-size: 13.5px; color: ${t.cameraStatus === 'online' ? 'var(--color-success)' : (t.cameraStatus === 'pending' ? 'var(--color-warning)' : 'var(--color-danger)')}; margin-top: 2px;">
                ${isPending ? 'Awaiting Pairing' : t.cameraStatus.toUpperCase() + ' (' + t.cameraFps + ' FPS)'}
              </div>
            </div>

            <div style="background: var(--bg-dark-base); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px;">
              <span style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 700;">Printer Status</span>
              <div style="font-weight: 700; font-size: 13.5px; color: ${t.printerStatus === 'ready' ? 'var(--color-success)' : (t.printerStatus === 'pending' ? 'var(--color-warning)' : 'var(--color-danger)')}; margin-top: 2px;">
                ${isPending ? 'Awaiting Pairing' : t.printerStatus.replace('_', ' ').toUpperCase()}
              </div>
            </div>

            <div style="background: var(--bg-dark-base); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px;">
              <span style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 700;">Network Latency</span>
              <div style="font-weight: 700; font-size: 13.5px; color: var(--accent-primary); margin-top: 2px;">
                ${isPending ? 'Unpaired' : t.internetType.toUpperCase() + ' (' + t.internetLatencyMs + ' ms)'}
              </div>
            </div>
          </div>

          <h3 style="font-size: 13px; font-weight: 700; margin-bottom: 12px; text-transform: uppercase; color: var(--text-tertiary);">System Details & Diagnostics</h3>

          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 24px;">
            <tr style="border-bottom: 1px solid var(--border-subtle);">
              <td style="padding: 10px 0; color: var(--text-secondary);">Hardware ID (UUID)</td>
              <td style="padding: 10px 0; font-family: var(--font-mono); font-weight: 600; text-align: right;">${selectedBooth.id}</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--border-subtle);">
              <td style="padding: 10px 0; color: var(--text-secondary);">Software Version</td>
              <td style="padding: 10px 0; font-weight: 600; text-align: right;">${selectedBooth.appVersion}</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--border-subtle);">
              <td style="padding: 10px 0; color: var(--text-secondary);">Business Model & Revenue</td>
              <td style="padding: 10px 0; font-weight: 600; text-align: right; color: var(--accent-primary);">${modelText}</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--border-subtle);">
              <td style="padding: 10px 0; color: var(--text-secondary);">Current Theme</td>
              <td style="padding: 10px 0; font-weight: 600; text-align: right;">${selectedBooth.currentTheme}</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--border-subtle);">
              <td style="padding: 10px 0; color: var(--text-secondary);">Storage Usage</td>
              <td style="padding: 10px 0; font-weight: 600; text-align: right;">${isPending ? 'Unpaired' : t.storageUsedGb + ' GB / ' + t.storageTotalGb + ' GB'}</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--border-subtle);">
              <td style="padding: 10px 0; color: var(--text-secondary);">RAM Memory Usage</td>
              <td style="padding: 10px 0; font-weight: 600; text-align: right;">${isPending ? 'Unpaired' : t.memoryUsedMb + ' MB / ' + t.memoryTotalMb + ' MB'}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: var(--text-secondary);">Paper Roll Remaining</td>
              <td style="padding: 10px 0; font-weight: 700; color: var(--color-success); text-align: right;">${selectedBooth.paperPrintsRemaining} prints (${t.paperRemainingPercent}%)</td>
            </tr>
          </table>

          <div style="display: flex; gap: 10px; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-subtle); padding-top: 16px; margin-top: 16px;">
            <button class="btn-portal" id="btn-delete-booth-detail" data-booth-id="${selectedBooth.id}" style="background: rgba(239, 68, 68, 0.1); color: var(--color-danger); border: 1px solid rgba(239, 68, 68, 0.2);">
              ${Icons.delete(14)} Delete Booth Branch
            </button>
            <div style="display: flex; gap: 10px;">
              <button class="btn-portal btn-portal-secondary" id="btn-ping-booth">Send Diagnostic Ping</button>
              <button class="btn-portal btn-portal-primary" id="btn-refill-booth">Refill Paper Roll</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return `
    <div class="booths-view">
      <div class="page-header">
        <div class="page-title-group">
          <h1>Booth Fleet Management</h1>
          <p>Monitor status, paper levels, and diagnostic telemetry across all your location branches.</p>
        </div>
        <div class="page-actions">
          <button class="btn-portal btn-portal-primary" id="btn-open-add-booth-modal">
            ${Icons.plus(14)} Add New Booth Branch
          </button>
        </div>
      </div>

      <div class="booth-grid">
        ${boothCardsHtml}
      </div>

      ${modalHtml}
    </div>
  `;
}

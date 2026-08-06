import type { Booth } from '../types';
import { Icons } from './Icons';

export function renderMonitoringView(booths: Booth[]): string {
  const monitoringCardsHtml = booths.map(b => {
    const t = b.telemetry;
    const paperPct = t.paperRemainingPercent;
    const paperClass = paperPct > 40 ? 'success' : (paperPct > 15 ? 'warning' : 'danger');
    const cpuClass = t.cpuTempC < 50 ? 'success' : (t.cpuTempC < 65 ? 'warning' : 'danger');

    return `
      <div class="card-panel" style="margin-bottom: 20px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; border-bottom: 1px solid var(--border-subtle); padding-bottom: 12px;">
          <div>
            <h2 style="font-size: 16px; font-weight: 700; color: var(--text-primary);">${b.name}</h2>
            <span style="font-size: 12px; color: var(--text-tertiary); display: flex; align-items: center; gap: 4px; margin-top: 2px;">
              ${Icons.locationPin(12)} ${b.location} • Hardware ID: ${b.id}
            </span>
          </div>
          <span class="status-pill ${b.status === 'online' ? 'online' : 'offline'}">
            ${b.status === 'online' ? '<span class="pulse"></span> Telemetry Online' : '<span class="dot"></span> Connection Lost'}
          </span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 16px;">
          <div style="background: var(--bg-dark-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase;">Camera Sensor</span>
              <span style="color: var(--accent-primary); display: inline-flex;">${Icons.booths(16)}</span>
            </div>
            <div style="font-size: 18px; font-weight: 800; color: ${t.cameraStatus === 'online' ? 'var(--color-success)' : 'var(--color-danger)'}; margin-top: 4px;">
              ${t.cameraStatus === 'online' ? '30.0 FPS' : 'NO SIGNAL'}
            </div>
            <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 4px;">720p HD USB Capture</div>
          </div>

          <div style="background: var(--bg-dark-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase;">Thermal Printer</span>
              <span style="color: var(--text-primary); display: inline-flex;">${Icons.monitoring(16)}</span>
            </div>
            <div style="font-size: 18px; font-weight: 800; color: ${t.printerStatus === 'ready' ? 'var(--color-success)' : 'var(--color-warning)'}; margin-top: 4px;">
              ${t.printerStatus.replace('_', ' ').toUpperCase()}
            </div>
            <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 4px;">${t.printerModel}</div>
          </div>

          <div style="background: var(--bg-dark-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase;">Paper Roll Forecast</span>
              <span style="color: var(--color-success); display: inline-flex;">${Icons.activity(16)}</span>
            </div>
            <div style="font-size: 18px; font-weight: 800; font-family: var(--font-mono); color: var(--text-primary); margin-top: 4px;">
              ${b.paperPrintsRemaining} Prints Left
            </div>
            <div class="progress-bar-wrap" style="margin-top: 6px;">
              <div class="progress-bar-fill ${paperClass}" style="width: ${paperPct}%;"></div>
            </div>
          </div>

          <div style="background: var(--bg-dark-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase;">Storage Usage</span>
              <span style="color: var(--text-tertiary); display: inline-flex;">${Icons.settings(16)}</span>
            </div>
            <div style="font-size: 18px; font-weight: 800; font-family: var(--font-mono); color: var(--text-primary); margin-top: 4px;">
              ${t.storageUsedGb} GB / ${t.storageTotalGb} GB
            </div>
            <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 4px;">${Math.round((t.storageUsedGb/t.storageTotalGb)*100)}% Capacity</div>
          </div>

          <div style="background: var(--bg-dark-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="font-size: 11px; color: var(--text-tertiary); text-transform: uppercase;">CPU Temperature</span>
              <span style="color: var(--color-warning); display: inline-flex;">${Icons.activity(16)}</span>
            </div>
            <div style="font-size: 18px; font-weight: 800; font-family: var(--font-mono); color: ${cpuClass === 'success' ? 'var(--color-success)' : 'var(--color-danger)'}; margin-top: 4px;">
              ${t.cpuTempC}°C
            </div>
            <div style="font-size: 11px; color: var(--text-tertiary); margin-top: 4px;">Thermal Throttle Safe</div>
          </div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="monitoring-view">
      <div class="page-header">
        <div class="page-title-group">
          <h1>Device Monitoring & Hardware Health</h1>
          <p>Real-time diagnostic telemetry, printer paper roll forecasts, and hardware sensors.</p>
        </div>
      </div>

      ${monitoringCardsHtml}
    </div>
  `;
}

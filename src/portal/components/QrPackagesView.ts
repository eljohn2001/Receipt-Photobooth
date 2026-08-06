import type { PackageConfig } from '../types';
import { Icons } from './Icons';

export function renderQrPackagesView(packages: PackageConfig[]): string {
  const cardsHtml = packages.map(pkg => `
    <div class="card-panel" style="display: flex; flex-direction: column; justify-content: space-between;">
      <div>
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
          <div>
            <h3 style="font-size: 16px; font-weight: 700; color: var(--text-primary);">${pkg.name}</h3>
            <span style="font-size: 12px; color: var(--text-tertiary);">${pkg.photos} Photos • ${pkg.prints} Print Copies</span>
          </div>
          <span style="font-size: 20px; font-weight: 800; font-family: var(--font-mono); color: var(--accent-primary);">₱${pkg.price.toFixed(2)}</span>
        </div>

        <div style="background: var(--bg-dark-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px; margin-bottom: 14px; text-align: center;">
          <div id="qr-container-${pkg.id}" class="qr-canvas-holder" style="min-height: 180px; display: flex; align-items: center; justify-content: center;">
            <span style="color: var(--text-tertiary); font-size: 12px;">Generating QR Code...</span>
          </div>
          <code style="font-size: 10px; color: var(--text-tertiary); display: block; margin-top: 6px;">${pkg.qrData}</code>
        </div>

        <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px;">
          <strong>Allowed Layouts:</strong> ${pkg.allowedLayouts.join(', ')}
        </div>
      </div>

      <div style="display: flex; gap: 8px;">
        <button class="btn-portal btn-portal-secondary btn-portal-sm btn-download-qr" data-pkg-id="${pkg.id}" style="flex: 1;">
          Download PNG
        </button>
        <button class="btn-portal btn-portal-primary btn-portal-sm btn-print-qr" data-pkg-id="${pkg.id}" style="flex: 1; display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
          ${Icons.monitoring(14)} Print Card
        </button>
      </div>
    </div>
  `).join('');

  return `
    <div class="qr-packages-view">
      <div class="page-header">
        <div class="page-title-group">
          <h1>QR Package Management</h1>
          <p>Configure custom print packages and generate printable payment QR codes for customers.</p>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
        ${cardsHtml}
      </div>
    </div>
  `;
}

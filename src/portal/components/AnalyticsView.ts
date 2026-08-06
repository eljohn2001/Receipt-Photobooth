import type { AnalyticsSummary } from '../types';
import { Icons } from './Icons';

export function renderAnalyticsView(analytics: AnalyticsSummary): string {
  const layoutsHtml = analytics.printsByLayout.map(l => `
    <div style="margin-bottom: 14px;">
      <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
        <span style="font-weight: 600; color: var(--text-primary);">${l.label}</span>
        <span style="font-family: var(--font-mono); color: var(--text-secondary);">${l.count} sessions (${l.percentage}%)</span>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill" style="width: ${l.percentage}%; background: var(--accent-primary);"></div>
      </div>
    </div>
  `).join('');

  const paymentsHtml = analytics.paymentBreakdown.length > 0 ? analytics.paymentBreakdown.map(p => `
    <div style="margin-bottom: 14px;">
      <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px;">
        <span style="font-weight: 600; color: var(--text-primary);">${p.method}</span>
        <span style="font-family: var(--font-mono); color: var(--text-secondary);">${p.count} (${p.percentage}%)</span>
      </div>
      <div class="progress-bar-wrap">
        <div class="progress-bar-fill success" style="width: ${p.percentage}%;"></div>
      </div>
    </div>
  `).join('') : `
    <div style="text-align: center; padding: 20px; color: var(--text-tertiary); font-size: 12.5px;">
      GCash QR E-Wallet payments active across kiosks.
    </div>
  `;

  const packagesHtml = analytics.packageSales.map(pkg => `
    <div style="background: var(--bg-dark-card); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 16px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-weight: 700; font-size: 14px; color: var(--text-primary);">${pkg.name}</div>
        <div style="font-size: 12px; color: var(--text-tertiary);">${pkg.count} total packages sold</div>
      </div>
      <div style="text-align: right;">
        <div style="font-size: 16px; font-weight: 800; font-family: var(--font-mono); color: var(--accent-primary);">₱${pkg.revenue.toLocaleString()}</div>
        <div style="font-size: 11px; color: var(--color-success); font-weight: 600;">Gross Sales</div>
      </div>
    </div>
  `).join('');

  return `
    <div class="analytics-view">
      <div class="page-header">
        <div class="page-title-group">
          <h1>Analytics Suite & Insights</h1>
          <p>Interactive sales metrics, layout popularity, and customer behavior breakdowns.</p>
        </div>
        <div class="page-actions">
          <div style="display: flex; background: var(--bg-dark-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); gap: 4px; padding: 4px;">
            <button class="btn-portal btn-portal-primary btn-portal-sm">7 Days</button>
            <button class="btn-portal btn-portal-secondary btn-portal-sm">30 Days</button>
            <button class="btn-portal btn-portal-secondary btn-portal-sm">YTD</button>
          </div>
        </div>
      </div>

      <h2 style="font-size: 15px; font-weight: 700; margin-bottom: 14px; color: var(--text-primary); display: flex; align-items: center; gap: 6px;">
        <span style="color: var(--accent-primary); display: inline-flex;">${Icons.qrPackages(16)}</span>
        <span>Package Sales Performance</span>
      </h2>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px;">
        ${packagesHtml}
      </div>

      <div class="charts-grid">
        <div class="card-panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Layout & Photo Grid Popularity</h2>
              <span class="panel-subtitle">Distribution of frame choices selected by customers</span>
            </div>
          </div>
          <div style="padding-top: 10px;">
            ${layoutsHtml}
          </div>
        </div>

        <div class="card-panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Payment Methods</h2>
              <span class="panel-subtitle">Cash vs QR E-Wallet distribution</span>
            </div>
          </div>
          <div style="padding-top: 10px;">
            ${paymentsHtml}
          </div>
        </div>
      </div>
    </div>
  `;
}

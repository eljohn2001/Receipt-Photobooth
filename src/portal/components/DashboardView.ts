import type { Booth, SessionRecord, AnalyticsSummary } from '../types';
import { renderEmptyState } from './EmptyState';
import { Icons } from './Icons';

export function renderDashboardView(
  booths: Booth[], 
  sessions: SessionRecord[], 
  analytics: AnalyticsSummary
): string {
  const onlineBooths = booths.filter(b => b.status === 'online').length;
  const offlineBooths = booths.filter(b => b.status === 'offline').length;
  const todayRev = sessions.reduce((acc, s) => acc + s.totalAmount, 0);
  const todaySess = sessions.length;
  const todayPrints = sessions.reduce((acc, s) => acc + s.printsCount, 0);

  if (booths.length === 0) {
    return `
      <div class="dashboard-view">
        <div class="page-header">
          <div class="page-title-group">
            <h1>Executive Dashboard</h1>
            <p>Real-time performance metrics and revenue telemetry across your booth network.</p>
          </div>
        </div>
        ${renderEmptyState(
          '🏪',
          'No Booths Provisioned Yet',
          'Your client organization has no active photobooths linked to this account. Click below to provision your first booth branch.',
          '➕ Add New Booth Branch',
          'btn-open-add-booth-modal-dash'
        )}
      </div>
    `;
  }

  const maxRev = Math.max(...analytics.revenueByDay.map(r => r.amount), 1);
  const chartBarsHtml = analytics.revenueByDay.map(d => {
    const heightPct = Math.round((d.amount / maxRev) * 100);
    return `
      <div style="display: flex; flex-direction: column; align-items: center; gap: 6px; flex: 1;">
        <span style="font-size: 10px; color: var(--text-tertiary); font-family: var(--font-mono);">₱${(d.amount / 1000).toFixed(1)}k</span>
        <div style="width: 100%; max-width: 32px; height: 120px; background: var(--bg-dark-base); border-radius: var(--radius-sm); display: flex; align-items: flex-end; overflow: hidden;">
          <div style="width: 100%; height: ${heightPct}%; background: var(--accent-primary); border-radius: var(--radius-sm); transition: height 0.4s cubic-bezier(0.16, 1, 0.3, 1);"></div>
        </div>
        <span style="font-size: 11px; font-weight: 600; color: var(--text-secondary);">${d.label}</span>
      </div>
    `;
  }).join('');

  return `
    <div class="dashboard-view">
      <div class="page-header">
        <div class="page-title-group">
          <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
            <h1>Executive Dashboard</h1>
            <button class="header-refresh-chip" id="btn-refresh-dash" title="Refresh Live Telemetry">
              <span class="refresh-icon">${Icons.refresh(14)}</span>
              <span>Sync</span>
            </button>
          </div>
          <p>Real-time performance metrics and revenue telemetry across your booth network.</p>
        </div>
      </div>

      <div class="metrics-grid">
        <div class="card-metric">
          <div class="metric-header">
            <span class="metric-title">Today's Revenue</span>
            <div class="metric-icon" style="color: var(--color-success); font-weight: 800; font-family: var(--font-mono);">₱</div>
          </div>
          <div class="metric-value">₱${todayRev.toLocaleString()}</div>
          <div class="metric-footer">
            <span class="trend-badge up">Live</span>
            <span class="trend-label">Active cloud ledger</span>
          </div>
        </div>

        <div class="card-metric">
          <div class="metric-header">
            <span class="metric-title">Today's Sessions</span>
            <div class="metric-icon" style="color: var(--accent-primary);">${Icons.booths(16)}</div>
          </div>
          <div class="metric-value">${todaySess}</div>
          <div class="metric-footer">
            <span class="trend-badge up">Live</span>
            <span class="trend-label">${todaySess} sessions completed</span>
          </div>
        </div>

        <div class="card-metric">
          <div class="metric-header">
            <span class="metric-title">Today's Prints</span>
            <div class="metric-icon" style="color: var(--text-primary);">${Icons.monitoring(16)}</div>
          </div>
          <div class="metric-value">${todayPrints}</div>
          <div class="metric-footer">
            <span class="trend-label">Thermal prints generated</span>
          </div>
        </div>

        <div class="card-metric">
          <div class="metric-header">
            <span class="metric-title">Active Fleet</span>
            <div class="metric-icon" style="color: var(--color-success);">${Icons.activity(16)}</div>
          </div>
          <div class="metric-value" style="color: var(--color-success);">${onlineBooths} / ${booths.length}</div>
          <div class="metric-footer">
            <span style="color: ${offlineBooths > 0 ? 'var(--color-danger)' : 'var(--text-tertiary)'}; font-weight: 600;">
              ${offlineBooths} Offline
            </span>
          </div>
        </div>
      </div>

      <div class="charts-grid">
        <div class="card-panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">7-Day Revenue Trend (₱)</div>
              <div class="panel-subtitle">Gross revenue collected across active branches</div>
            </div>
            <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--text-primary);">
              7-Day Total: ₱${analytics.totalRevenue7d.toLocaleString()}
            </div>
          </div>
          <div style="display: flex; align-items: flex-end; justify-content: space-between; height: 160px; padding-top: 14px; gap: 8px;">
            ${chartBarsHtml}
          </div>
        </div>

        <div class="card-panel">
          <div class="panel-header">
            <div>
              <div class="panel-title">Peak Session Hours</div>
              <div class="panel-subtitle">Busiest customer times of day</div>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 10px;">
            ${analytics.peakHours.length > 0 ? analytics.peakHours.map(h => `
              <div>
                <div style="display: flex; justify-content: space-between; font-size: 11.5px; margin-bottom: 3px;">
                  <span style="color: var(--text-secondary); font-weight: 600;">${h.hour}</span>
                  <span style="font-family: var(--font-mono); font-weight: 700; color: var(--text-primary);">${h.count} sessions</span>
                </div>
                <div class="progress-bar-wrap">
                  <div class="progress-bar-fill" style="width: ${Math.min(100, Math.round((h.count / 80) * 100))}%;"></div>
                </div>
              </div>
            `).join('') : `
              <div style="font-size: 12.5px; color: var(--text-tertiary); padding: 20px 0; text-align: center;">
                No peak session hour telemetry logged yet.
              </div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}

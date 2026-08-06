import type { ActivityEvent } from '../types';
import { Icons } from './Icons';

export function renderActivityView(events: ActivityEvent[]): string {
  if (events.length === 0) {
    return `
      <div class="activity-view">
        <div class="page-header">
          <div class="page-title-group">
            <h1>Live Activity Timeline</h1>
            <p>Real-time stream of customer interactions, transactions, and printing events.</p>
          </div>
          <div class="page-actions">
            <span class="status-pill online"><span class="pulse"></span> Live Sync Streaming</span>
          </div>
        </div>
        <div class="card-panel" style="text-align: center; padding: 40px 20px; color: var(--text-tertiary);">
          <div style="font-size: 32px; margin-bottom: 8px; color: var(--accent-primary); display: flex; justify-content: center;">
            ${Icons.activity(32)}
          </div>
          <div style="font-weight: 700; font-size: 15px; color: var(--text-primary);">No Live Activity Logged Yet</div>
          <div style="font-size: 12.5px; margin-top: 4px;">Customer capture sessions and printing events will stream live here once paired kiosk hardware is active.</div>
        </div>
      </div>
    `;
  }

  const timelineHtml = events.map(e => {
    let eventIconSvg = Icons.activity(16);
    if (e.type === 'purchase') eventIconSvg = Icons.transactions(16);
    if (e.type === 'print') eventIconSvg = Icons.monitoring(16);

    return `
      <div class="timeline-item">
        <div class="timeline-node"></div>
        <div class="timeline-content">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span class="timeline-time">${new Date(e.timestamp).toLocaleTimeString()}</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 11px; font-weight: 600; background: var(--bg-dark-card); padding: 2px 8px; border-radius: var(--radius-sm); color: var(--text-tertiary); display: inline-flex; align-items: center; gap: 4px;">
                ${Icons.locationPin(12)} ${e.boothName}
              </span>
              <button class="btn-portal btn-portal-secondary btn-portal-sm btn-delete-activity" data-event-id="${e.id}" style="color: var(--color-danger); border-color: rgba(239,68,68,0.2); padding: 2px 6px; font-size: 10.5px;">
                ${Icons.delete(12)} Delete
              </button>
            </div>
          </div>
          <div class="timeline-title" style="display: flex; align-items: center; gap: 6px; margin-top: 4px;">
            <span style="color: var(--accent-primary); display: inline-flex;">${eventIconSvg}</span>
            <span>${e.title}</span>
          </div>
          <div class="timeline-desc">${e.detail}</div>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="activity-view">
      <div class="page-header">
        <div class="page-title-group">
          <h1>Live Activity Timeline</h1>
          <p>Real-time stream of customer interactions, transactions, and printing events.</p>
        </div>
        <div class="page-actions">
          <span class="status-pill online"><span class="pulse"></span> Live Sync Streaming</span>
        </div>
      </div>

      <div class="card-panel">
        <div class="timeline-feed">
          ${timelineHtml}
        </div>
      </div>
    </div>
  `;
}

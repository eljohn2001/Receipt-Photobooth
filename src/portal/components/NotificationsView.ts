import type { NotificationItem } from '../types';
import { Icons } from './Icons';

export function renderNotificationsView(notifications: NotificationItem[]): string {
  const notifCardsHtml = notifications.map(n => {
    let iconSvg = Icons.notifications(18);
    let borderColor = 'var(--accent-primary)';
    if (n.type === 'error') { borderColor = 'var(--color-danger)'; }
    else if (n.type === 'warning') { borderColor = 'var(--color-warning)'; }
    else if (n.type === 'success') { borderColor = 'var(--color-success)'; }

    return `
      <div style="background: var(--bg-dark-surface); border: 1px solid var(--border-subtle); border-left: 4px solid ${borderColor}; border-radius: var(--radius-md); padding: 16px; margin-bottom: 12px; display: flex; gap: 14px; align-items: flex-start;">
        <span style="color: ${borderColor}; display: inline-flex; margin-top: 2px;">${iconSvg}</span>
        <div style="flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <h3 style="font-size: 14px; font-weight: 700; color: var(--text-primary);">${n.title}</h3>
            <span style="font-size: 11px; color: var(--text-tertiary); font-family: var(--font-mono);">${new Date(n.timestamp).toLocaleTimeString()}</span>
          </div>
          <p style="font-size: 12.5px; color: var(--text-secondary); margin-top: 4px;">${n.message}</p>
          ${n.boothName ? `
            <span style="display: inline-flex; align-items: center; gap: 4px; margin-top: 8px; font-size: 11px; background: var(--bg-dark-card); padding: 2px 8px; border-radius: var(--radius-sm); color: var(--text-tertiary);">
              ${Icons.locationPin(10)} ${n.boothName}
            </span>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="notifications-view">
      <div class="page-header">
        <div class="page-title-group">
          <h1>Notification Center</h1>
          <p>Real-time alerts, offline warnings, paper roll notifications, and cloud sync logs.</p>
        </div>
        <div class="page-actions">
          <button class="btn-portal btn-portal-secondary btn-portal-sm" id="btn-mark-all-read">
            Mark All as Read
          </button>
        </div>
      </div>

      <div style="max-width: 800px;">
        ${notifCardsHtml.length > 0 ? notifCardsHtml : `
          <div class="card-panel" style="text-align: center; color: var(--text-tertiary); padding: 40px 20px;">
            <div style="font-size: 28px; margin-bottom: 8px; color: var(--text-tertiary); display: flex; justify-content: center;">
              ${Icons.notifications(32)}
            </div>
            <div style="font-weight: 700; font-size: 14px; color: var(--text-primary);">All Caught Up!</div>
            <div style="font-size: 12px; margin-top: 2px;">No unread system alerts or telemetry warnings.</div>
          </div>
        `}
      </div>
    </div>
  `;
}

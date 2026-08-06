import type { PortalTab } from '../types';
import { Icons } from './Icons';

export function renderBottomSheet(isOpen: boolean, unreadNotifCount = 0): string {
  const items: { id: PortalTab; label: string; iconSvg: string; desc: string }[] = [
    { id: 'transactions', label: 'Transactions Ledger', iconSvg: Icons.transactions(20), desc: 'Audit customer sales & CSV export' },
    { id: 'qr-packages', label: 'QR Package Manager', iconSvg: Icons.qrPackages(20), desc: 'Package prices & payment QR cards' },
    { id: 'monitoring', label: 'Device Health Monitoring', iconSvg: Icons.monitoring(20), desc: 'Paper roll forecast & diagnostics' },
    { id: 'notifications', label: 'Notifications', iconSvg: Icons.notifications(20), desc: `${unreadNotifCount} unread system alerts` },
    { id: 'settings', label: 'Remote Settings & Branding', iconSvg: Icons.settings(20), desc: 'Configure pricing, branding & text' },
    { id: 'help', label: 'Help & Partner Support', iconSvg: Icons.help(20), desc: 'Documentation & 24/7 support line' }
  ];

  const itemsHtml = items.map(item => `
    <button class="sheet-item-btn" data-sheet-tab="${item.id}">
      <span class="sheet-item-icon" style="color: var(--text-primary); display: flex; align-items: center; justify-content: center; background: var(--bg-dark-base); padding: 10px; border-radius: var(--radius-md);">
        ${item.iconSvg}
      </span>
      <div style="text-align: left;">
        <div style="font-weight: 700; color: var(--text-primary); font-size: 13px;">${item.label}</div>
        <div style="font-size: 11px; color: var(--text-tertiary); font-weight: 400; margin-top: 1px;">${item.desc}</div>
      </div>
    </button>
  `).join('');

  return `
    <div class="ios-bottom-sheet-overlay ${isOpen ? 'open' : ''}" id="ios-bottom-sheet">
      <div class="ios-bottom-sheet-content">
        <div class="sheet-drag-handle"></div>
        
        <!-- Account Quick Actions Bar -->
        <div style="display: flex; align-items: center; justify-content: space-between; background: var(--bg-dark-base); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 12px 16px; margin-bottom: 18px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <button class="btn-portal btn-portal-secondary btn-portal-sm" id="btn-theme-toggle-sheet" title="Toggle Dark/Light Theme">
              ${Icons.sunMoon(14)} Theme
            </button>
            <button class="btn-portal btn-portal-secondary btn-portal-sm" id="btn-notif-sheet" title="Notifications">
              ${Icons.notifications(14)} Alerts ${unreadNotifCount > 0 ? `<span class="badge-dot" style="position: static; display: inline-block;"></span>` : ''}
            </button>
          </div>
          <button class="btn-portal btn-portal-secondary btn-portal-sm" id="btn-portal-logout-sheet" style="color: var(--color-danger); border-color: rgba(239, 68, 68, 0.2);">
            ${Icons.logout(14)} Sign Out
          </button>
        </div>

        <div class="sheet-title" style="font-size: 15px; font-weight: 700; margin-bottom: 12px;">More Modules & Controls</div>
        
        <div class="sheet-grid">
          ${itemsHtml}
        </div>
      </div>
    </div>
  `;
}

import type { PortalTab } from '../types';
import { Icons } from './Icons';

export function renderSidebar(activeTab: PortalTab, unreadNotifCount: number): string {
  const tabs: { id: PortalTab; label: string; iconSvg: string; badge?: number }[] = [
    { id: 'dashboard', label: 'Dashboard Overview', iconSvg: Icons.home(18) },
    { id: 'booths', label: 'Booth Management', iconSvg: Icons.booths(18) },
    { id: 'activity', label: 'Live Activity Stream', iconSvg: Icons.activity(18) },
    { id: 'analytics', label: 'Analytics Suite', iconSvg: Icons.analytics(18) },
    { id: 'transactions', label: 'Transactions History', iconSvg: Icons.transactions(18) },
    { id: 'settings', label: 'Remote Settings', iconSvg: Icons.settings(18) },
    { id: 'qr-packages', label: 'QR Package Manager', iconSvg: Icons.qrPackages(18) },
    { id: 'monitoring', label: 'Device Monitoring', iconSvg: Icons.monitoring(18) },
    { id: 'notifications', label: 'Notifications', iconSvg: Icons.notifications(18), badge: unreadNotifCount }
  ];

  const navItemsHtml = tabs.map(t => `
    <button class="nav-item ${activeTab === t.id ? 'active' : ''}" data-tab="${t.id}">
      <span class="nav-icon">${t.iconSvg}</span>
      <span>${t.label}</span>
      ${t.badge && t.badge > 0 ? `<span class="nav-badge danger">${t.badge}</span>` : ''}
    </button>
  `).join('');

  return `
    <aside class="portal-sidebar" id="portal-sidebar">
      <div class="sidebar-header">
        <div class="brand-badge">S</div>
        <div class="brand-info">
          <span class="brand-name">Snapreceipt™</span>
          <span class="brand-sub">Client Portal</span>
        </div>
      </div>

      <nav class="sidebar-nav">
        ${navItemsHtml}
      </nav>

      <div class="sidebar-footer">
        <div style="font-size: 11px; color: var(--text-tertiary);">
          Snapreceipt™ Platform v1.5.0<br/>
          Partner Cloud Engine
        </div>
      </div>
    </aside>
  `;
}

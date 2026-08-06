import type { PortalTab } from '../types';
import { Icons } from './Icons';

export function renderMobileBottomNav(activeTab: PortalTab): string {
  const tabs: { id: PortalTab; label: string; iconSvg: string }[] = [
    { id: 'dashboard', label: 'Home', iconSvg: Icons.home(20) },
    { id: 'booths', label: 'Booths', iconSvg: Icons.booths(20) },
    { id: 'analytics', label: 'Analytics', iconSvg: Icons.analytics(20) },
    { id: 'activity', label: 'Activity', iconSvg: Icons.activity(20) },
    { id: 'more', label: 'More', iconSvg: Icons.more(20) }
  ];

  const pillsHtml = tabs.map(t => {
    const isActive = (t.id === activeTab) || (t.id === 'more' && !['dashboard', 'booths', 'analytics', 'activity'].includes(activeTab));
    return `
      <button class="mobile-pill-item ${isActive ? 'active' : ''}" data-mobile-tab="${t.id}">
        <span class="pill-icon">${t.iconSvg}</span>
        <span class="pill-label">${t.label}</span>
      </button>
    `;
  }).join('');

  return `
    <nav class="portal-mobile-bottom-nav">
      <div class="mobile-nav-pills">
        ${pillsHtml}
      </div>
    </nav>
  `;
}

import type { Organization } from '../types';
import { portalDb } from '../services/portal-db';
import { Icons } from './Icons';

export function renderHeader(
  activeOrg: Organization, 
  activeBranch: string, 
  _unreadCount: number
): string {
  const orgs = portalDb.getOrganizations();
  const orgOptionsHtml = orgs.map((org: Organization) => 
    `<option value="${org.id}" ${org.id === activeOrg.id ? 'selected' : ''}>${org.name}</option>`
  ).join('');

  const branchOptionsHtml = activeOrg.branches.map((b: string) => 
    `<option value="${b}" ${b === activeBranch ? 'selected' : ''}>${b}</option>`
  ).join('');

  return `
    <header class="portal-header">
      <div class="header-top-row">
        
        <!-- Left: Cafe Name & Avatar -->
        <div class="header-cafe-title">
          <div class="user-avatar">${activeOrg.name.charAt(0)}</div>
          <div class="cafe-name-container">
            <span class="cafe-name-text">${activeOrg.name}</span>
            ${orgs.length > 1 ? `
              <select id="select-portal-tenant" class="tenant-select-hidden">
                ${orgOptionsHtml}
              </select>
            ` : ''}
          </div>
        </div>

        <!-- Right: Location Branch Dropdown -->
        <div class="header-location-chip">
          <span class="pin-icon">${Icons.locationPin(13)}</span>
          <select id="select-portal-branch" class="branch-select-native">
            ${branchOptionsHtml}
          </select>
          <span class="dropdown-chevron">▾</span>
        </div>

      </div>
    </header>
  `;
}

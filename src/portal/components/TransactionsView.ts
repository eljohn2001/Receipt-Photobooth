import type { SessionRecord } from '../types';
import { Icons } from './Icons';

export function renderTransactionsView(sessions: SessionRecord[], searchTerm = '', statusFilter = 'all'): string {
  let filtered = sessions;

  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(s => 
      s.id.toLowerCase().includes(term) ||
      s.boothName.toLowerCase().includes(term) ||
      s.location.toLowerCase().includes(term) ||
      (s.packageName && s.packageName.toLowerCase().includes(term))
    );
  }

  if (statusFilter !== 'all') {
    filtered = filtered.filter(s => s.completionStatus === statusFilter);
  }

  const rowsHtml = filtered.slice(0, 15).map(s => `
    <tr>
      <td style="font-family: var(--font-mono); font-weight: 600; font-size: 12px; color: var(--accent-primary);">${s.id}</td>
      <td>${new Date(s.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</td>
      <td>
        <div style="font-weight: 600;">${s.boothName}</div>
        <div style="font-size: 11px; color: var(--text-tertiary); display: flex; align-items: center; gap: 3px;">
          ${Icons.locationPin(10)} ${s.location}
        </div>
      </td>
      <td>${s.packageName || 'Standard'}</td>
      <td style="font-family: var(--font-mono); font-weight: 700;">₱${s.totalAmount.toFixed(2)}</td>
      <td style="font-family: var(--font-mono); color: var(--text-tertiary);">₱${s.snapShare.toFixed(2)}</td>
      <td style="font-family: var(--font-mono); font-weight: 700; color: var(--color-success);">₱${s.partnerShare.toFixed(2)}</td>
      <td>
        <span style="text-transform: uppercase; font-size: 11px; font-weight: 700; background: var(--bg-dark-card); padding: 3px 8px; border-radius: var(--radius-sm); color: var(--text-secondary);">
          ${s.paymentMethod}
        </span>
      </td>
      <td>
        <span class="status-pill ${s.completionStatus === 'completed' ? 'online' : 'offline'}">
          ${s.completionStatus === 'completed' ? 'Completed' : 'Cancelled'}
        </span>
      </td>
      <td style="text-align: right;">
        <button class="btn-portal btn-portal-secondary btn-portal-sm btn-delete-session" data-session-id="${s.id}" style="color: var(--color-danger); border-color: rgba(239,68,68,0.2);">
          ${Icons.delete(12)} Delete
        </button>
      </td>
    </tr>
  `).join('');

  // Native iOS Mobile Card List Items
  const mobileCardsHtml = filtered.slice(0, 15).map(s => `
    <div class="ios-card-list-item">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-family: var(--font-mono); font-weight: 700; font-size: 12px; color: var(--accent-primary);">${s.id}</span>
        <span class="status-pill ${s.completionStatus === 'completed' ? 'online' : 'offline'}">
          ${s.completionStatus === 'completed' ? 'Completed' : 'Cancelled'}
        </span>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <div style="font-weight: 700; font-size: 14px; color: var(--text-primary);">${s.boothName}</div>
          <div style="font-size: 11.5px; color: var(--text-tertiary); margin-top: 2px;">${s.packageName || 'Standard Package'} • ${new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-family: var(--font-mono); font-weight: 800; font-size: 16px; color: var(--color-success);">₱${s.partnerShare.toFixed(2)}</div>
          <div style="font-size: 10px; color: var(--text-tertiary); text-transform: uppercase;">Your Share</div>
        </div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; pt-2; border-top: 1px solid var(--border-subtle); margin-top: 4px; font-size: 11.5px;">
        <span style="background: var(--bg-dark-base); padding: 3px 8px; border-radius: var(--radius-sm); font-weight: 600; text-transform: uppercase;">
          💳 ${s.paymentMethod}
        </span>
        <button class="btn-portal btn-portal-secondary btn-portal-sm btn-delete-session" data-session-id="${s.id}" style="color: var(--color-danger); border-color: rgba(239,68,68,0.2); padding: 2px 8px; font-size: 11px;">
          ${Icons.delete(12)} Delete Record
        </button>
      </div>
    </div>
  `).join('');

  return `
    <div class="transactions-view">
      <div class="page-header">
        <div class="page-title-group">
          <h1>Transaction History</h1>
          <p>Complete audit ledger of customer photobooth sessions and revenue share.</p>
        </div>
        <div class="page-actions">
          <button class="btn-portal btn-portal-primary" id="btn-export-csv">
            Export to CSV
          </button>
        </div>
      </div>

      <div style="display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap;">
        <input 
          type="text" 
          id="input-tx-search" 
          class="form-control" 
          placeholder="🔍 Search transaction ID, booth, package..." 
          value="${searchTerm}"
          style="flex: 1; min-width: 240px;"
        />

        <select id="select-tx-status" class="form-control" style="width: 160px;">
          <option value="all" ${statusFilter === 'all' ? 'selected' : ''}>All Statuses</option>
          <option value="completed" ${statusFilter === 'completed' ? 'selected' : ''}>Completed</option>
          <option value="cancelled" ${statusFilter === 'cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </div>

      <!-- Desktop Datatable -->
      <div class="table-container">
        <table class="portal-table">
          <thead>
            <tr>
              <th>Tx ID</th>
              <th>Date & Time</th>
              <th>Booth / Location</th>
              <th>Package</th>
              <th>Amount (₱)</th>
              <th>Snapceipt Share</th>
              <th>Your Earnings</th>
              <th>Payment</th>
              <th>Status</th>
              <th style="text-align: right;">Action</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="10" style="text-align: center; padding: 24px; color: var(--text-tertiary);">No transactions found matching query.</td></tr>'}
          </tbody>
        </table>
      </div>

      <!-- Native iOS Mobile Card List -->
      <div class="mobile-card-list">
        ${mobileCardsHtml.length > 0 ? mobileCardsHtml : '<div class="card-panel" style="text-align: center; padding: 30px; color: var(--text-tertiary);">No transactions found matching query.</div>'}
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; font-size: 12px; color: var(--text-tertiary);">
        <span>Showing 1 to ${Math.min(15, filtered.length)} of ${filtered.length} entries</span>
        <div style="display: flex; gap: 8px;">
          <button class="btn-portal btn-portal-secondary btn-portal-sm" disabled>Previous</button>
          <button class="btn-portal btn-portal-secondary btn-portal-sm">Next</button>
        </div>
      </div>
    </div>
  `;
}

export function renderAddBoothModal(isOpen: boolean, defaultOrgName: string): string {
  if (!isOpen) return '';

  return `
    <div class="portal-modal-overlay open" id="add-booth-modal-overlay">
      <div class="portal-modal-content">
        <div class="sheet-drag-handle"></div>

        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-subtle); padding-bottom: 14px; margin-bottom: 18px;">
          <div>
            <h2 style="font-size: 18px; font-weight: 700;">➕ Register New Booth Branch</h2>
            <p style="font-size: 12px; color: var(--text-tertiary); margin-top: 2px;">Provision a new photobooth machine for ${defaultOrgName}</p>
          </div>
          <button class="btn-portal btn-portal-secondary btn-portal-sm" id="btn-cancel-add-booth">✕</button>
        </div>

        <form id="form-add-booth" style="display: flex; flex-direction: column; gap: 16px;">
          
          <div class="form-group">
            <label>Branch / Venue Name</label>
            <input type="text" id="add-booth-name" class="form-control" placeholder="e.g. ${defaultOrgName} Boracay Beachfront" required />
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;" class="form-grid">
            <div class="form-group">
              <label>Location City / Island</label>
              <input type="text" id="add-booth-branch" class="form-control" placeholder="e.g. Boracay" required />
            </div>

            <div class="form-group">
              <label>Business Operations Model</label>
              <select id="add-booth-model" class="form-control" style="cursor: pointer;">
                <option value="profit_share">🟢 Profit Sharing (Revenue Split)</option>
                <option value="flat_rental">🎪 Flat Rental (100% Client Revenue)</option>
              </select>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;" class="form-grid">
            <div class="form-group">
              <label>Session Pricing Mode</label>
              <select id="add-booth-pricing-mode" class="form-control" style="cursor: pointer;">
                <option value="paid">💵 Paid Photo Sessions</option>
                <option value="free">🎉 Free Event Mode (₱0 Paywall Bypass)</option>
              </select>
            </div>

            <div class="form-group" id="group-booth-price">
              <label>Base Session Price (₱)</label>
              <input type="number" id="add-booth-price" class="form-control" value="99" min="0" required />
            </div>
          </div>

          <div class="form-group">
            <label>Full Address Details</label>
            <input type="text" id="add-booth-location" class="form-control" placeholder="e.g. Station 1 White Beach, Boracay Island" required />
          </div>

          <div class="form-group">
            <label>Snapreceipt™ Admin Issued Activation Key</label>
            <input type="text" id="add-booth-key" class="form-control" placeholder="e.g. ACT-SHAKA-8842" style="font-family: var(--font-mono); font-weight: 700; text-transform: uppercase;" required />
            <p style="font-size: 11.5px; color: var(--text-tertiary); margin-top: 4px;">
              Enter the official activation key provided by Snapreceipt Admin upon license purchase.
            </p>
          </div>

          <div style="background: var(--bg-dark-base); border: 1px dashed var(--border-subtle); border-radius: var(--radius-md); padding: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
            <span style="font-size: 11.5px; color: var(--text-secondary);">Need a new booth license key?</span>
            <button type="button" class="btn-portal btn-portal-secondary btn-portal-sm" id="btn-request-license-key">
              📩 Request Key from Admin
            </button>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px; border-top: 1px solid var(--border-subtle); padding-top: 16px;">
            <button type="button" class="btn-portal btn-portal-secondary" id="btn-close-add-booth">Cancel</button>
            <button type="submit" class="btn-portal btn-portal-primary">🚀 Pair & Provision Branch</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

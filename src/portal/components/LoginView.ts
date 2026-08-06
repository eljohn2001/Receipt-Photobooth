export function renderLoginView(errorMessage?: string): string {
  return `
    <div class="portal-login-overlay" style="min-height: 100vh; width: 100vw; display: flex; align-items: center; justify-content: center; background: var(--bg-dark-base); padding: 20px; font-family: var(--font-sans);">
      <div style="background: var(--bg-dark-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); width: 100%; max-width: 440px; padding: 32px; box-shadow: var(--shadow-md); color: var(--text-primary);">
        
        <div style="display: flex; flex-direction: column; align-items: center; text-align: center; margin-bottom: 24px;">
          <div style="background: #111827; color: #fff; width: 48px; height: 48px; border-radius: 14px; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 22px; margin-bottom: 12px; box-shadow: var(--shadow-sm);">S</div>
          <h1 style="font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">Snapreceipt™ Client Portal</h1>
          <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">Sign in to manage your photobooth fleet & revenue telemetry</p>
        </div>

        ${errorMessage ? `
          <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid var(--color-danger); color: var(--color-danger); font-size: 12.5px; padding: 10px 14px; border-radius: var(--radius-md); margin-bottom: 16px; font-weight: 600;">
            ⚠️ ${errorMessage}
          </div>
        ` : ''}

        <form id="form-portal-login" style="display: flex; flex-direction: column; gap: 16px;">
          <div class="form-group">
            <label>Partner Account Email / Org Slug</label>
            <input type="text" id="login-email" class="form-control" placeholder="e.g. partner@shakacafes.com" required />
          </div>

          <div class="form-group">
            <label>Password or Partner API Key</label>
            <input type="password" id="login-password" class="form-control" placeholder="••••••••••••" required />
          </div>

          <button type="submit" class="btn-portal btn-portal-primary" style="width: 100%; justify-content: center; padding: 11px; font-size: 14px; margin-top: 4px;">
            🔑 Sign In to Client Portal
          </button>
        </form>

        <div style="margin-top: 24px; text-align: center; font-size: 11.5px; color: var(--text-tertiary);">
          Protected by Snapreceipt™ Enterprise Tenant Isolation Engine
        </div>
      </div>
    </div>
  `;
}

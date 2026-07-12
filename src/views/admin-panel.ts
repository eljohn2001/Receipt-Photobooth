import { supabase } from '../services/supabase';

export class AdminPanelView {
  private container: HTMLElement;
  private currentTab: 'dashboard' | 'booths' | 'licenses' | 'sessions' | 'revenue' = 'dashboard';
  private userSession: any = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async init(): Promise<void> {
    // Inject typography and styling specifically for admin portal
    this.injectAdminStyles();

    // Check if user is logged in
    const { data: { session } } = await supabase.auth.getSession();
    this.userSession = session;

    if (this.userSession) {
      await this.renderDashboard();
    } else {
      this.renderLogin();
    }

    // Set up auth state change listener
    supabase.auth.onAuthStateChange(async (_event, session) => {
      this.userSession = session;
      if (this.userSession) {
        await this.renderDashboard();
      } else {
        this.renderLogin();
      }
    });
  }

  private renderLogin(): void {
    this.container.innerHTML = `
      <div class="admin-login-wrapper">
        <div class="admin-login-card">
          <div class="login-header">
            <h1 class="login-title">SNAPCEIPT</h1>
            <p class="login-subtitle">Cloud Administration Portal</p>
          </div>
          <form id="login-form">
            <div class="form-group">
              <label for="login-email">Email Address</label>
              <input type="email" id="login-email" placeholder="admin@snapceipt.com" required />
            </div>
            <div class="form-group">
              <label for="login-password">Password</label>
              <input type="password" id="login-password" placeholder="••••••••" required />
            </div>
            <div id="login-error" class="login-error-msg hidden"></div>
            <button type="submit" class="btn btn-login">ACCESS CLOUD DASHBOARD</button>
          </form>
          <div class="login-footer">
            powered by blcklabs &copy; 2026
          </div>
        </div>
      </div>
    `;

    const form = this.container.querySelector('#login-form') as HTMLFormElement;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const emailInput = this.container.querySelector('#login-email') as HTMLInputElement;
      const passwordInput = this.container.querySelector('#login-password') as HTMLInputElement;
      const errorMsg = this.container.querySelector('#login-error') as HTMLElement;
      const loginBtn = this.container.querySelector('.btn-login') as HTMLButtonElement;

      if (!emailInput || !passwordInput) return;

      if (errorMsg) errorMsg.classList.add('hidden');
      if (loginBtn) {
        loginBtn.disabled = true;
        loginBtn.textContent = 'AUTHENTICATING...';
      }

      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: emailInput.value.trim(),
          password: passwordInput.value,
        });

        if (error) {
          if (errorMsg) {
            errorMsg.textContent = error.message;
            errorMsg.classList.remove('hidden');
          }
          if (loginBtn) {
            loginBtn.disabled = false;
            loginBtn.textContent = 'ACCESS CLOUD DASHBOARD';
          }
        }
      } catch (err: any) {
        if (errorMsg) {
          errorMsg.textContent = 'Connection error. Please try again.';
          errorMsg.classList.remove('hidden');
        }
        if (loginBtn) {
          loginBtn.disabled = false;
          loginBtn.textContent = 'ACCESS CLOUD DASHBOARD';
        }
      }
    });
  }

  private async renderDashboard(): Promise<void> {
    this.container.innerHTML = `
      <div class="admin-portal-layout">
        <!-- Sidebar Navigation -->
        <aside class="portal-sidebar">
          <div class="portal-brand">
            <span class="brand-logo">📸</span>
            <div class="brand-info">
              <span class="brand-name">SNAPCEIPT</span>
              <span class="brand-tag">Cloud Console</span>
            </div>
          </div>
          <nav class="portal-nav">
            <button class="nav-item ${this.currentTab === 'dashboard' ? 'active' : ''}" data-tab="dashboard">
              <span class="nav-icon">📊</span> Overview Dashboard
            </button>
            <button class="nav-item ${this.currentTab === 'booths' ? 'active' : ''}" data-tab="booths">
              <span class="nav-icon">🖨</span> Booth Management
            </button>
            <button class="nav-item ${this.currentTab === 'licenses' ? 'active' : ''}" data-tab="licenses">
              <span class="nav-icon">🔑</span> Cafés & Licenses
            </button>
            <button class="nav-item ${this.currentTab === 'sessions' ? 'active' : ''}" data-tab="sessions">
              <span class="nav-icon">🎞</span> Session History
            </button>
            <button class="nav-item ${this.currentTab === 'revenue' ? 'active' : ''}" data-tab="revenue">
              <span class="nav-icon">💰</span> Profit Sharing & Revenue
            </button>
          </nav>
          <div class="portal-sidebar-footer">
            <div class="user-badge">
              <div class="user-icon">👤</div>
              <div class="user-email">${this.userSession.user.email}</div>
            </div>
            <button id="btn-logout" class="btn-logout-sidebar">🚪 Logout</button>
          </div>
        </aside>

        <!-- Main Workspace -->
        <main class="portal-main">
          <header class="portal-header">
            <h2 id="portal-header-title">Overview Dashboard</h2>
            <div class="portal-header-actions">
              <span class="sync-status-indicator"><span class="status-dot online"></span> System Connected</span>
              <button id="btn-refresh-dashboard" class="btn btn-header-refresh">🔄 Refresh Data</button>
            </div>
          </header>
          <div id="portal-content" class="portal-content-body">
            <div class="admin-loading-spinner">
              <div class="spinner"></div>
              <p>Fetching Snapceipt Cloud records...</p>
            </div>
          </div>
        </main>
      </div>
    `;

    // Hook events
    const logoutBtn = this.container.querySelector('#btn-logout');
    logoutBtn?.addEventListener('click', async () => {
      await supabase.auth.signOut();
    });

    const refreshBtn = this.container.querySelector('#btn-refresh-dashboard');
    refreshBtn?.addEventListener('click', async () => {
      await this.loadTabContent();
    });

    const navItems = this.container.querySelectorAll('.portal-nav .nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', async () => {
        const tab = item.getAttribute('data-tab') as any;
        if (!tab) return;
        this.currentTab = tab;
        
        // Update active class
        navItems.forEach(ni => ni.classList.remove('active'));
        item.classList.add('active');

        // Update header title
        const headerTitle = this.container.querySelector('#portal-header-title');
        if (headerTitle) {
          headerTitle.textContent = item.textContent?.trim().replace(/^[^\s]+\s+/, '') || '';
        }

        await this.loadTabContent();
      });
    });

    // Load initial tab content
    await this.loadTabContent();
  }

  private async loadTabContent(): Promise<void> {
    const contentBody = this.container.querySelector('#portal-content');
    if (!contentBody) return;

    // Show loading spinner
    contentBody.innerHTML = `
      <div class="admin-loading-spinner" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 300px; gap: 15px;">
        <div class="spinner" style="width: 40px; height: 40px; border: 3px solid rgba(0,0,0,0.1); border-top-color: #000000; border-radius: 50%; animation: spin 1s linear infinite;"></div>
        <p style="font-family: 'Space Grotesk', sans-serif; font-size: 14px; color: #666;">Fetching Cloud ledger...</p>
      </div>
    `;

    try {
      if (this.currentTab === 'dashboard') {
        await this.loadDashboardTab(contentBody);
      } else if (this.currentTab === 'booths') {
        await this.loadBoothsTab(contentBody);
      } else if (this.currentTab === 'licenses') {
        await this.loadLicensesTab(contentBody);
      } else if (this.currentTab === 'sessions') {
        await this.loadSessionsTab(contentBody);
      } else if (this.currentTab === 'revenue') {
        await this.loadRevenueTab(contentBody);
      }
    } catch (err) {
      console.error('[Cloud Admin] Tab loading failure:', err);
      contentBody.innerHTML = `
        <div class="error-pane" style="padding: 30px; text-align: center; background: #fff5f5; border: 1px solid #ffc9c9; color: #c92a2a; border-radius: 8px;">
          <h3>⚠️ Failed to retrieve database records</h3>
          <p style="margin-top: 8px; font-size: 14px;">Please check Row-Level Security (RLS) configurations or network connectivity.</p>
        </div>
      `;
    }
  }

  private async loadDashboardTab(container: Element): Promise<void> {
    const { data: booths, error: boothsErr } = await supabase.from('booths').select('*');
    const { data: sessions, error: sessionsErr } = await supabase.from('sessions').select('*');

    if (boothsErr || sessionsErr) throw boothsErr || sessionsErr;

    const totalBooths = booths.length;
    const now = new Date();
    
    // Status counters
    let activeBoothsCount = 0;
    let offlineBoothsCount = 0;

    booths.forEach(b => {
      if (b.last_sync_at) {
        const lastSync = new Date(b.last_sync_at);
        const diffMs = now.getTime() - lastSync.getTime();
        // Online if synced within last 1 hour
        if (diffMs < 60 * 60 * 1000) {
          activeBoothsCount++;
        } else {
          offlineBoothsCount++;
        }
      } else {
        offlineBoothsCount++;
      }
    });

    const totalSessions = sessions.length;
    const totalPrints = sessions.reduce((sum, s) => sum + (s.prints_count || 0) + (s.additional_prints || 0), 0);
    const totalRevenue = sessions.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);

    // Calculate revenue totals
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todaySessions = sessions.filter(s => new Date(s.created_at) >= startOfToday);
    const weekSessions = sessions.filter(s => new Date(s.created_at) >= startOfWeek);
    const monthSessions = sessions.filter(s => new Date(s.created_at) >= startOfMonth);

    const todayRevenue = todaySessions.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
    const weekRevenue = weekSessions.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
    const monthRevenue = monthSessions.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);

    // Order sessions by created_at desc for recent activity
    const recentActivity = [...sessions]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);

    container.innerHTML = `
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Total Booths</span>
            <span class="metric-icon">🏪</span>
          </div>
          <div class="metric-value">${totalBooths}</div>
          <div class="metric-subtext">
            <span style="color: #2f9e44; font-weight: bold;">${activeBoothsCount} Active</span> &bull; 
            <span style="color: #e69500; font-weight: bold;">${offlineBoothsCount} Offline</span>
          </div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Total Sessions</span>
            <span class="metric-icon">🎞</span>
          </div>
          <div class="metric-value">${totalSessions}</div>
          <div class="metric-subtext">Lifetime completed captures</div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Total Prints</span>
            <span class="metric-icon">🖨</span>
          </div>
          <div class="metric-value">${totalPrints}</div>
          <div class="metric-subtext">Lifetime copies printed</div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Gross Revenue</span>
            <span class="metric-icon">💰</span>
          </div>
          <div class="metric-value">₱${totalRevenue.toFixed(2)}</div>
          <div class="metric-subtext">All time transaction totals</div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Today's Revenue</span>
            <span class="metric-icon">☕</span>
          </div>
          <div class="metric-value" style="color: #2f9e44;">₱${todayRevenue.toFixed(2)}</div>
          <div class="metric-subtext">Today's collection breakdown</div>
        </div>
      </div>

      <div class="dashboard-details-row">
        <!-- Recent Activity Feed -->
        <div class="details-card feed-card">
          <h3>Recent Session Logs</h3>
          <div class="activity-feed">
            ${recentActivity.length === 0 ? '<p style="color: #666; padding: 15px 0;">No sessions synced yet.</p>' : recentActivity.map(s => {
              const dateStr = new Date(s.created_at).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
              const booth = booths.find(b => b.id === s.booth_id);
              return `
                <div class="feed-item">
                  <div class="item-time">${dateStr}</div>
                  <div class="item-details">
                    <strong>${booth ? booth.name : 'Unknown Booth'}</strong> printed ${s.prints_count} copies (${s.layout_type})
                  </div>
                  <div class="item-price">+₱${parseFloat(s.total_amount).toFixed(2)}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Revenue Summaries Card -->
        <div class="details-card totals-card">
          <h3>Collection Overviews</h3>
          <div class="summary-list">
            <div class="summary-row">
              <span>Today's Total</span>
              <strong>₱${todayRevenue.toFixed(2)}</strong>
            </div>
            <div class="summary-row">
              <span>This Week (7d)</span>
              <strong>₱${weekRevenue.toFixed(2)}</strong>
            </div>
            <div class="summary-row">
              <span>This Month (30d)</span>
              <strong>₱${monthRevenue.toFixed(2)}</strong>
            </div>
            <div class="summary-row total-highlight">
              <span>Grand Total</span>
              <strong>₱${totalRevenue.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private async loadBoothsTab(container: Element): Promise<void> {
    const { data: booths, error: boothsErr } = await supabase.from('booths').select('*');

    if (boothsErr) throw boothsErr;

    const now = new Date();

    container.innerHTML = `
      <div class="details-card" style="width: 100%; box-sizing: border-box;">
        <h3>Registered Snapceipt Kiosks</h3>
        <div class="table-container">
          <table class="portal-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Booth Name</th>
                <th>Booth ID (Device ID)</th>
                <th>Assigned Café</th>
                <th>Pricing</th>
                <th>Profit Split</th>
                <th>Last Sync</th>
                <th>App Version</th>
              </tr>
            </thead>
            <tbody>
              ${booths.length === 0 ? '<tr><td colspan="8" style="text-align:center; padding: 20px;">No booths registered yet. Sync a Kiosk online to link it.</td></tr>' : booths.map(b => {
                let statusClass = 'offline';
                let statusLabel = 'Offline';

                if (b.last_sync_at) {
                  const lastSync = new Date(b.last_sync_at);
                  const diffMs = now.getTime() - lastSync.getTime();
                  if (diffMs < 60 * 60 * 1000) {
                    statusClass = 'online';
                    statusLabel = 'Online';
                  } else {
                    statusClass = 'offline';
                    statusLabel = 'Inactive';
                  }
                }

                const lastSyncDateStr = b.last_sync_at 
                  ? new Date(b.last_sync_at).toLocaleString('en-US', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
                  : 'Never';

                return `
                  <tr>
                    <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                    <td style="font-weight: 600;">${b.name}</td>
                    <td class="font-mono" style="font-size: 11px;">${b.id}</td>
                    <td>${b.assigned_cafe}</td>
                    <td class="font-mono">₱${parseFloat(b.pricing_per_session).toFixed(2)}</td>
                    <td class="font-mono">${b.profit_share_percent}% / ${100 - b.profit_share_percent}%</td>
                    <td>${lastSyncDateStr}</td>
                    <td class="font-mono">${b.app_version || 'unknown'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  private async loadLicensesTab(container: Element): Promise<void> {
    const { data: licenses, error: licErr } = await supabase
      .from('licenses')
      .select('*')
      .order('created_at', { ascending: false });

    if (licErr) throw licErr;

    container.innerHTML = `
      <div class="split-layout" style="display: grid; grid-template-columns: 350px 1fr; gap: 24px; width: 100%; box-sizing: border-box;">
        
        <!-- Register Café Form Card -->
        <div class="details-card" style="height: fit-content;">
          <h3>🔑 Register Café & License</h3>
          <p style="font-size: 13px; color: #666; margin-bottom: 20px;">
            Create a new partner activation code. When the kiosk registers using this code, it will automatically connect to this café name.
          </p>
          
          <form id="form-register-cafe" style="display: flex; flex-direction: column; gap: 16px;">
            <div class="form-group" style="display: flex; flex-direction: column; gap: 6px;">
              <label for="reg-cafe-name" style="font-size: 12px; font-weight: bold; text-transform: uppercase;">Café Name</label>
              <input type="text" id="reg-cafe-name" placeholder="e.g. Beans & Bites Café" required style="padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; background: #fff; color: #000;" />
            </div>
            
            <div class="form-group" style="display: flex; flex-direction: column; gap: 6px;">
              <label for="reg-cafe-email" style="font-size: 12px; font-weight: bold; text-transform: uppercase;">Owner Email</label>
              <input type="email" id="reg-cafe-email" placeholder="e.g. owner@beansbites.com" required style="padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; background: #fff; color: #000;" />
            </div>
            
            <div class="form-group" style="display: flex; flex-direction: column; gap: 6px;">
              <label for="reg-custom-key" style="font-size: 12px; font-weight: bold; text-transform: uppercase;">Custom Key (Optional)</label>
              <input type="text" id="reg-custom-key" placeholder="e.g. SNAP-BEANS-5555" style="padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; text-transform: uppercase; background: #fff; color: #000;" />
              <span style="font-size: 11px; color: #888;">Leave blank to auto-generate a random key</span>
            </div>

            <div id="reg-form-error" class="hidden" style="background: #fff5f5; color: #c92a2a; border: 1px solid #ffc9c9; padding: 10px; border-radius: 6px; font-size: 12px;"></div>
            <div id="reg-form-success" class="hidden" style="background: #ebfbee; color: #2b8a3e; border: 1px solid #d3f9d8; padding: 10px; border-radius: 6px; font-size: 12px;"></div>

            <button type="submit" class="btn-primary-action" style="background: #000; color: #fff; border: none; padding: 12px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; margin-top: 8px;">
              Generate Activation Code
            </button>
          </form>
        </div>

        <!-- Licenses List Card -->
        <div class="details-card" style="box-sizing: border-box; width: 100%;">
          <h3>📋 Active Activation Codes</h3>
          <div class="table-container" style="margin-top: 15px;">
            <table class="portal-table" style="width: 100%; text-align: left; border-collapse: collapse;">
              <thead>
                <tr>
                  <th>Café Name</th>
                  <th>Activation Key</th>
                  <th>Binding Status</th>
                  <th>Created At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${licenses.length === 0 ? `
                  <tr>
                    <td colspan="5" style="text-align: center; color: #888; padding: 30px;">No activation keys registered yet.</td>
                  </tr>
                ` : licenses.map(l => {
                  const isBound = !!l.device_id;
                  const dateStr = new Date(l.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' });
                  return `
                    <tr>
                      <td style="font-weight: 600;">${l.client_name || 'N/A'}</td>
                      <td>
                        <code style="background: #f1f3f5; padding: 4px 8px; border-radius: 4px; font-family: monospace; font-size: 13px; font-weight: bold; color: #333;">
                          ${l.key}
                        </code>
                      </td>
                      <td>
                        ${isBound ? `
                          <span style="display: inline-flex; align-items: center; gap: 4px; background: #e6fcf5; color: #0ca678; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">
                            🔒 Active (${l.device_id.substring(0, 8)}...)
                          </span>
                        ` : `
                          <span style="display: inline-flex; align-items: center; gap: 4px; background: #fff9db; color: #f08c00; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">
                            🔓 Unbound (Ready)
                          </span>
                        `}
                      </td>
                      <td style="font-size: 13px; color: #666;">${dateStr}</td>
                      <td>
                        <div style="display: flex; gap: 8px;">
                          ${isBound ? `
                            <button class="btn-deactivate-device" data-id="${l.id}" data-key="${l.key}" style="background: #fff0f6; border: 1px solid #ffdeeb; color: #d6336c; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">
                              Reset Device
                            </button>
                          ` : ''}
                          <button class="btn-delete-license" data-id="${l.id}" data-key="${l.key}" style="background: #fff5f5; border: 1px solid #ffe3e3; color: #e03131; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    `;

    // Hook Form Submit
    const form = container.querySelector('#form-register-cafe') as HTMLFormElement;
    form?.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const cafeNameInput = container.querySelector('#reg-cafe-name') as HTMLInputElement;
      const cafeEmailInput = container.querySelector('#reg-cafe-email') as HTMLInputElement;
      const customKeyInput = container.querySelector('#reg-custom-key') as HTMLInputElement;
      
      const errorMsg = container.querySelector('#reg-form-error') as HTMLElement;
      const successMsg = container.querySelector('#reg-form-success') as HTMLElement;
      const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;

      if (!cafeNameInput || !cafeEmailInput) return;

      if (errorMsg) errorMsg.classList.add('hidden');
      if (successMsg) successMsg.classList.add('hidden');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'GENERATING...';
      }

      try {
        let key = customKeyInput.value.trim().toUpperCase();
        if (!key) {
          // Generate key in SNAP-XXXX-XXXX-XXXX format
          const rand = () => Math.random().toString(36).substring(2, 6).toUpperCase();
          key = `SNAP-${rand()}-${rand()}-${rand()}`;
        }

        // Insert into licenses
        const { error: insErr } = await supabase
          .from('licenses')
          .insert({
            key,
            client_name: cafeNameInput.value.trim(),
            client_email: cafeEmailInput.value.trim(),
            is_active: true,
            device_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insErr) {
          if (errorMsg) {
            errorMsg.textContent = insErr.message || 'Failed to create license key.';
            errorMsg.classList.remove('hidden');
          }
        } else {
          if (successMsg) {
            successMsg.innerHTML = `<strong>Success!</strong> Registered Key: <code style="font-weight:bold;">${key}</code>`;
            successMsg.classList.remove('hidden');
            form.reset();
            // Refresh key listing after a short delay
            setTimeout(() => this.loadTabContent(), 1000);
          }
        }
      } catch (err: any) {
        if (errorMsg) {
          errorMsg.textContent = err.message || 'An unexpected error occurred.';
          errorMsg.classList.remove('hidden');
        }
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Generate Activation Code';
        }
      }
    });

    // Hook Delete Buttons
    const deleteBtns = container.querySelectorAll('.btn-delete-license');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const key = btn.getAttribute('data-key');
        if (!id) return;
        if (!confirm(`Are you sure you want to delete activation key ${key}?`)) return;

        try {
          const { error } = await supabase.from('licenses').delete().eq('id', id);
          if (error) {
            alert('Failed to delete license: ' + error.message);
          } else {
            await this.loadTabContent();
          }
        } catch (err: any) {
          alert('Error: ' + err.message);
        }
      });
    });

    // Hook Reset Device Buttons
    const resetBtns = container.querySelectorAll('.btn-deactivate-device');
    resetBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const key = btn.getAttribute('data-key');
        if (!id) return;
        if (!confirm(`Reset binding for key ${key}? This will allow it to be registered on a new photobooth device.`)) return;

        try {
          const { error } = await supabase
            .from('licenses')
            .update({
              device_id: null,
              activated_at: null,
              updated_at: new Date().toISOString()
            })
            .eq('id', id);
          
          if (error) {
            alert('Failed to reset key: ' + error.message);
          } else {
            await this.loadTabContent();
          }
        } catch (err: any) {
          alert('Error: ' + err.message);
        }
      });
    });
  }

  private async loadSessionsTab(container: Element): Promise<void> {
    const { data: booths, error: boothsErr } = await supabase.from('booths').select('*');
    const { data: sessions, error: sessionsErr } = await supabase.from('sessions').select('*');

    if (boothsErr || sessionsErr) throw boothsErr || sessionsErr;

    // Set up filter dropdowns
    const boothOptions = booths.map(b => `<option value="${b.id}">${b.name}</option>`).join('');

    container.innerHTML = `
      <div class="filter-bar">
        <div class="filter-group">
          <label>Filter by Booth</label>
          <select id="filter-booth-select">
            <option value="all">All Booths</option>
            ${boothOptions}
          </select>
        </div>
        <div class="filter-group">
          <label>Date Filter</label>
          <input type="date" id="filter-date-input" />
        </div>
        <button id="btn-clear-filters" class="btn btn-secondary" style="padding: 10px 16px; margin-top: auto; height: fit-content;">Clear Filters</button>
      </div>

      <div class="details-card" style="width: 100%; box-sizing: border-box;">
        <h3>Session Transaction Logs</h3>
        <div class="table-container">
          <table class="portal-table" id="sessions-table">
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Booth</th>
                <th>Date & Time</th>
                <th>Template</th>
                <th>Copies</th>
                <th>Revenue</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="sessions-table-body">
              <!-- Filled by filter logic -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Filter implementation
    const tableBody = this.container.querySelector('#sessions-table-body') as HTMLElement;
    const boothSelect = this.container.querySelector('#filter-booth-select') as HTMLSelectElement;
    const dateInput = this.container.querySelector('#filter-date-input') as HTMLInputElement;
    const clearBtn = this.container.querySelector('#btn-clear-filters');

    const renderFilteredSessions = () => {
      const selectedBooth = boothSelect.value;
      const selectedDate = dateInput.value; // YYYY-MM-DD

      let filtered = [...sessions];

      if (selectedBooth !== 'all') {
        filtered = filtered.filter(s => s.booth_id === selectedBooth);
      }

      if (selectedDate) {
        filtered = filtered.filter(s => {
          const sDate = new Date(s.created_at);
          const filterDate = new Date(selectedDate);
          return sDate.getFullYear() === filterDate.getFullYear() &&
                 sDate.getMonth() === filterDate.getMonth() &&
                 sDate.getDate() === filterDate.getDate();
        });
      }

      // Sort desc by date
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (filtered.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #666;">No matching session logs.</td></tr>';
        return;
      }

      tableBody.innerHTML = filtered.map(s => {
        const dateStr = new Date(s.created_at).toLocaleString('en-US', { hour12: false });
        const booth = booths.find(b => b.id === s.booth_id);
        return `
          <tr>
            <td class="font-mono" style="font-size: 11px;">${s.id}</td>
            <td style="font-weight: 600;">${booth ? booth.name : 'Unknown Booth'}</td>
            <td>${dateStr}</td>
            <td><span class="layout-badge">${s.template_id}</span></td>
            <td class="font-mono" style="text-align: center;">${s.prints_count}</td>
            <td class="font-mono" style="font-weight: 600;">₱${parseFloat(s.total_amount).toFixed(2)}</td>
            <td><span class="status-badge online">Synced</span></td>
          </tr>
        `;
      }).join('');
    };

    boothSelect.addEventListener('change', renderFilteredSessions);
    dateInput.addEventListener('change', renderFilteredSessions);
    clearBtn?.addEventListener('click', () => {
      boothSelect.value = 'all';
      dateInput.value = '';
      renderFilteredSessions();
    });

    // Run initial filter render
    renderFilteredSessions();
  }

  private async loadRevenueTab(container: Element): Promise<void> {
    const { data: booths, error: boothsErr } = await supabase.from('booths').select('*');
    const { data: sessions, error: sessionsErr } = await supabase.from('sessions').select('*');

    if (boothsErr || sessionsErr) throw boothsErr || sessionsErr;

    const totalRevenue = sessions.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
    const totalSnapShare = sessions.reduce((sum, s) => sum + parseFloat(s.snapceipt_share || 0), 0);
    const totalPartnerShare = sessions.reduce((sum, s) => sum + parseFloat(s.partner_share || 0), 0);

    // Group revenue by Cafe
    const revenueByBooth: Record<string, { name: string, gross: number, snap: number, partner: number, sessionsCount: number }> = {};
    
    booths.forEach(b => {
      revenueByBooth[b.id] = {
        name: b.name,
        gross: 0,
        snap: 0,
        partner: 0,
        sessionsCount: 0
      };
    });

    sessions.forEach(s => {
      if (revenueByBooth[s.booth_id]) {
        revenueByBooth[s.booth_id].gross += parseFloat(s.total_amount || 0);
        revenueByBooth[s.booth_id].snap += parseFloat(s.snapceipt_share || 0);
        revenueByBooth[s.booth_id].partner += parseFloat(s.partner_share || 0);
        revenueByBooth[s.booth_id].sessionsCount++;
      } else {
        // Fallback for untracked booth IDs
        if (!revenueByBooth['legacy']) {
          revenueByBooth['legacy'] = { name: 'Legacy Booth Archive', gross: 0, snap: 0, partner: 0, sessionsCount: 0 };
        }
        revenueByBooth['legacy'].gross += parseFloat(s.total_amount || 0);
        revenueByBooth['legacy'].snap += parseFloat(s.snapceipt_share || 0);
        revenueByBooth['legacy'].partner += parseFloat(s.partner_share || 0);
        revenueByBooth['legacy'].sessionsCount++;
      }
    });

    container.innerHTML = `
      <div class="metrics-grid" style="grid-template-columns: repeat(3, 1fr);">
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Grand Gross Revenue</span>
            <span class="metric-icon">💰</span>
          </div>
          <div class="metric-value">₱${totalRevenue.toFixed(2)}</div>
          <div class="metric-subtext">Sum of all Kiosks</div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Snapceipt Profit Share</span>
            <span class="metric-icon">⚡</span>
          </div>
          <div class="metric-value" style="color: #2f9e44;">₱${totalSnapShare.toFixed(2)}</div>
          <div class="metric-subtext">Snapceipt Cloud Ledger Share</div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Partner Café Share</span>
            <span class="metric-icon">☕</span>
          </div>
          <div class="metric-value" style="color: #1c7ed6;">₱${totalPartnerShare.toFixed(2)}</div>
          <div class="metric-subtext">Sum to disperse to café partners</div>
        </div>
      </div>

      <div class="details-card" style="width: 100%; box-sizing: border-box; margin-top: 20px;">
        <h3>Revenue Distribution Ledger</h3>
        <div class="table-container">
          <table class="portal-table">
            <thead>
              <tr>
                <th>Café / Booth Name</th>
                <th style="text-align: center;">Total Transactions</th>
                <th style="text-align: right;">Gross Collected</th>
                <th style="text-align: right;">Snapceipt Share</th>
                <th style="text-align: right;">Partner Share</th>
                <th style="text-align: right;">Config Split</th>
              </tr>
            </thead>
            <tbody>
              ${Object.values(revenueByBooth).length === 0 ? '<tr><td colspan="6" style="text-align:center; padding: 20px;">No revenue records logged.</td></tr>' : Object.values(revenueByBooth).map(r => {
                const boothConfig = booths.find(b => b.name === r.name);
                const splitText = boothConfig ? `${boothConfig.profit_share_percent}% / ${100 - boothConfig.profit_share_percent}%` : '50% / 50%';
                return `
                  <tr>
                    <td style="font-weight: 600;">${r.name}</td>
                    <td style="text-align: center;" class="font-mono">${r.sessionsCount}</td>
                    <td style="text-align: right; font-weight: 600;" class="font-mono">₱${r.gross.toFixed(2)}</td>
                    <td style="text-align: right; color: #2f9e44;" class="font-mono">₱${r.snap.toFixed(2)}</td>
                    <td style="text-align: right; color: #1c7ed6;" class="font-mono">₱${r.partner.toFixed(2)}</td>
                    <td style="text-align: right;" class="font-mono">${splitText}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  private injectAdminStyles(): void {
    if (document.getElementById('snapceipt-admin-styles')) return;

    const styleEl = document.createElement('style');
    styleEl.id = 'snapceipt-admin-styles';
    styleEl.innerHTML = `
      /* Admin Portal Colors and Styles conforming to Snapceipt Design language */
      .admin-login-wrapper {
        background-color: #f8f9fa;
        min-height: 100vh;
        width: 100vw;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0;
        padding: 20px;
        box-sizing: border-box;
      }
      .admin-login-card {
        background: #ffffff;
        border: 1px solid rgba(0, 0, 0, 0.08);
        border-radius: 12px;
        box-shadow: 0 15px 35px rgba(0, 0, 0, 0.05);
        padding: 40px 30px;
        width: 100%;
        max-width: 400px;
        display: flex;
        flex-direction: column;
        text-align: center;
      }
      .login-header {
        margin-bottom: 30px;
      }
      .login-title {
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700;
        font-size: 28px;
        letter-spacing: 2px;
        margin: 0;
      }
      .login-subtitle {
        font-size: 13px;
        color: #868e96;
        margin: 6px 0 0 0;
      }
      .login-error-msg {
        background-color: #fff5f5;
        border: 1px solid #ffc9c9;
        color: #c92a2a;
        padding: 10px;
        border-radius: 6px;
        font-size: 12px;
        margin-bottom: 20px;
        text-align: left;
      }
      .btn-login {
        background-color: #000000;
        color: #ffffff;
        border: none;
        padding: 14px;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 1px;
        cursor: pointer;
        width: 100%;
        border-radius: 6px;
        transition: opacity 0.2s;
      }
      .btn-login:hover {
        opacity: 0.85;
      }
      .login-footer {
        margin-top: 30px;
        font-size: 10px;
        color: #adb5bd;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      /* Portal Layout */
      .admin-portal-layout {
        display: flex;
        min-height: 100vh;
        width: 100vw;
        background-color: #f8f9fa;
        overflow: hidden;
      }
      .portal-sidebar {
        width: 260px;
        background-color: #ffffff;
        border-right: 1px solid rgba(0, 0, 0, 0.06);
        display: flex;
        flex-direction: column;
        padding: 24px 16px;
        box-sizing: border-box;
        flex-shrink: 0;
      }
      .portal-brand {
        display: flex;
        align-items: center;
        gap: 12px;
        padding-bottom: 24px;
        border-bottom: 1px solid rgba(0,0,0,0.06);
        margin-bottom: 20px;
      }
      .brand-logo {
        font-size: 24px;
      }
      .brand-name {
        font-family: 'Space Grotesk', sans-serif;
        font-weight: 700;
        font-size: 16px;
        letter-spacing: 1.5px;
        display: block;
      }
      .brand-tag {
        font-size: 10px;
        color: #868e96;
        text-transform: uppercase;
        display: block;
        letter-spacing: 0.5px;
      }
      .portal-nav {
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex-grow: 1;
      }
      .nav-item {
        display: flex;
        align-items: center;
        gap: 12px;
        background: none;
        border: none;
        color: #495057;
        font-size: 14px;
        font-weight: 500;
        padding: 12px 14px;
        border-radius: 8px;
        cursor: pointer;
        text-align: left;
        width: 100%;
        font-family: 'Space Grotesk', sans-serif;
        transition: all 0.2s;
      }
      .nav-item:hover {
        background-color: #f1f3f5;
        color: #000000;
      }
      .nav-item.active {
        background-color: #000000;
        color: #ffffff;
      }
      .portal-sidebar-footer {
        padding-top: 15px;
        border-top: 1px solid rgba(0,0,0,0.06);
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .user-badge {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 6px;
      }
      .user-email {
        font-size: 12px;
        color: #495057;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .btn-logout-sidebar {
        background: none;
        border: 1px solid rgba(0,0,0,0.15);
        border-radius: 6px;
        padding: 8px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 600;
        text-align: center;
        transition: background-color 0.2s;
      }
      .btn-logout-sidebar:hover {
        background-color: #fff5f5;
        border-color: #ffc9c9;
        color: #c92a2a;
      }

      /* Main Workspace */
      .portal-main {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        height: 100vh;
        overflow-y: auto;
        padding: 30px;
        box-sizing: border-box;
      }
      .portal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 24px;
      }
      .portal-header h2 {
        font-family: 'Playfair Display', serif;
        font-size: 26px;
        font-weight: 500;
        margin: 0;
      }
      .sync-status-indicator {
        font-size: 12px;
        color: #868e96;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        margin-right: 15px;
      }
      .status-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
      .status-dot.online {
        background-color: #40c057;
      }
      .btn-header-refresh {
        background-color: #ffffff;
        border: 1px solid rgba(0,0,0,0.1);
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
      }
      .btn-header-refresh:hover {
        background-color: #f8f9fa;
      }

      /* Metrics Grid */
      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 20px;
        margin-bottom: 30px;
      }
      .metric-card {
        background: #ffffff;
        border: 1px solid rgba(0,0,0,0.06);
        border-radius: 10px;
        padding: 20px;
      }
      .metric-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #868e96;
        font-size: 12px;
        text-transform: uppercase;
        font-weight: 600;
        letter-spacing: 0.5px;
      }
      .metric-value {
        font-size: 28px;
        font-weight: 700;
        color: #000000;
        margin-top: 10px;
        font-family: 'Space Grotesk', sans-serif;
      }
      .metric-subtext {
        font-size: 11px;
        color: #868e96;
        margin-top: 6px;
      }

      /* Details Layout */
      .dashboard-details-row {
        display: grid;
        grid-template-columns: 3fr 2fr;
        gap: 20px;
      }
      .details-card {
        background: #ffffff;
        border: 1px solid rgba(0,0,0,0.06);
        border-radius: 10px;
        padding: 24px;
      }
      .details-card h3 {
        font-family: 'Space Grotesk', sans-serif;
        font-size: 16px;
        margin: 0 0 20px 0;
      }

      /* Activity Feed */
      .activity-feed {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .feed-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding-bottom: 12px;
        border-bottom: 1px solid rgba(0,0,0,0.04);
        font-size: 13px;
      }
      .feed-item:last-child {
        border-bottom: none;
        padding-bottom: 0;
      }
      .item-time {
        color: #adb5bd;
        font-family: monospace;
        font-size: 12px;
      }
      .item-details {
        flex-grow: 1;
        margin-left: 15px;
        color: #495057;
      }
      .item-price {
        font-weight: 600;
        font-family: monospace;
        color: #2f9e44;
      }

      /* Summaries */
      .summary-list {
        display: flex;
        flex-direction: column;
        gap: 15px;
      }
      .summary-row {
        display: flex;
        justify-content: space-between;
        font-size: 14px;
        padding-bottom: 12px;
        border-bottom: 1px dashed rgba(0,0,0,0.06);
      }
      .summary-row.total-highlight {
        border-bottom: none;
        padding-bottom: 0;
        font-size: 18px;
        font-weight: 700;
        color: #000000;
        font-family: 'Space Grotesk', sans-serif;
      }
      .summary-row.total-highlight strong {
        color: #2f9e44;
      }

      /* Table Styles */
      .table-container {
        overflow-x: auto;
        margin-top: 10px;
      }
      .portal-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
        font-size: 13px;
      }
      .portal-table th {
        background-color: #f8f9fa;
        color: #868e96;
        text-transform: uppercase;
        font-size: 10px;
        font-weight: 600;
        letter-spacing: 0.5px;
        padding: 12px 16px;
        border-bottom: 1px solid rgba(0,0,0,0.06);
      }
      .portal-table td {
        padding: 14px 16px;
        border-bottom: 1px solid rgba(0,0,0,0.04);
        color: #495057;
      }
      .portal-table tr:last-child td {
        border-bottom: none;
      }
      .font-mono {
        font-family: Courier, monospace;
      }
      .status-badge {
        display: inline-block;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .status-badge.online {
        background-color: #ebfbee;
        color: #2f9e44;
      }
      .status-badge.offline {
        background-color: #f1f3f5;
        color: #868e96;
      }

      /* Filters */
      .filter-bar {
        display: flex;
        gap: 15px;
        background-color: #ffffff;
        border: 1px solid rgba(0,0,0,0.06);
        border-radius: 10px;
        padding: 16px 20px;
        margin-bottom: 20px;
      }
      .filter-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
        flex-grow: 1;
      }
      .filter-group label {
        font-size: 11px;
        color: #868e96;
        text-transform: uppercase;
        font-weight: 600;
      }
      .filter-group select, .filter-group input {
        border: 1px solid rgba(0,0,0,0.15);
        border-radius: 6px;
        padding: 10px;
        font-size: 13px;
        font-family: inherit;
        background: #ffffff;
      }
      .layout-badge {
        background-color: #e8f4fd;
        color: #1c7ed6;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 600;
      }
    `;
    document.head.appendChild(styleEl);
  }
}

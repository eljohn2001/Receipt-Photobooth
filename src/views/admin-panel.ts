import { supabase } from '../services/supabase';

export class AdminPanelView {
  private container: HTMLElement;
  private currentTab: 'dashboard' | 'analytics' | 'booths' | 'licenses' | 'sessions' | 'revenue' | 'maintenance' | 'settings' = 'dashboard';
  private userSession: any = null;
  private isOfflineMode = false;
  private lastCacheTime: string | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async init(): Promise<void> {
    // Inject typography and styling specifically for admin portal
    this.injectAdminStyles();

    // Register offline / online network event listeners
    window.addEventListener('online', async () => {
      console.log('[Cloud Admin] Back online, syncing and reloading dashboard...');
      this.isOfflineMode = false;
      await this.syncOfflineActionsQueue();
      await this.loadTabContent();
    });

    window.addEventListener('offline', () => {
      console.log('[Cloud Admin] Connection lost, switched to offline mode');
      this.isOfflineMode = true;
      void this.loadTabContent();
    });

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
            <button class="nav-item ${this.currentTab === 'analytics' ? 'active' : ''}" data-tab="analytics">
              <span class="nav-icon">📈</span> Revenue & Layouts
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
            <button class="nav-item ${this.currentTab === 'maintenance' ? 'active' : ''}" data-tab="maintenance">
              <span class="nav-icon">📜</span> Maintenance Ledger
            </button>
            <button class="nav-item ${this.currentTab === 'settings' ? 'active' : ''}" data-tab="settings">
              <span class="nav-icon">⚙️</span> System Settings
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

        <!-- Sliding details drawer -->
        <div id="admin-detail-drawer" class="detail-drawer hidden">
          <div class="drawer-overlay" id="drawer-overlay"></div>
          <div class="drawer-content">
            <div class="drawer-header">
              <h3 id="drawer-title">Café Details</h3>
              <button type="button" id="drawer-close" class="drawer-close-btn">&times;</button>
            </div>
            <div class="drawer-body" id="drawer-body-content">
              <!-- Dynamic details -->
            </div>
          </div>
        </div>
      </div>
    `;

    // Hook events
    const drawer = this.container.querySelector('#admin-detail-drawer') as HTMLElement;
    const overlay = this.container.querySelector('#drawer-overlay');
    const drawerCloseBtn = this.container.querySelector('#drawer-close');

    const closeDrawer = () => {
      if (drawer) {
        drawer.classList.remove('active');
        setTimeout(() => {
          drawer.classList.add('hidden');
        }, 300);
      }
    };

    overlay?.addEventListener('click', closeDrawer);
    drawerCloseBtn?.addEventListener('click', closeDrawer);

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

  private async querySupabase<T>(
    cacheKey: string,
    onlineQueryFn: () => PromiseLike<any>
  ): Promise<T> {
    try {
      if (!navigator.onLine) {
        throw new Error('Browser reports offline status');
      }
      
      const { data, error } = await onlineQueryFn();
      if (error) throw error;
      if (data === null) throw new Error('Data is null');
      
      // Cache the data successfully
      localStorage.setItem(cacheKey, JSON.stringify(data));
      localStorage.setItem(cacheKey + '_timestamp', new Date().toISOString());
      return data as T;
    } catch (err) {
      console.warn(`[Cloud Admin] Query failed for ${cacheKey}, trying cache...`, err);
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        this.isOfflineMode = true;
        const timestamp = localStorage.getItem(cacheKey + '_timestamp');
        if (timestamp) {
          this.lastCacheTime = new Date(timestamp).toLocaleTimeString();
        }
        return JSON.parse(cached) as T;
      }
      throw err; // Re-throw if no cache exists
    }
  }

  private async executeSupabaseWrite(
    actionType: 'update_booth_info' | 'confirm_collection' | 'refill_paper' | 'bulk_collect',
    payload: any
  ): Promise<void> {
    try {
      if (!navigator.onLine || this.isOfflineMode) {
        throw new Error('Offline Mode Active');
      }

      if (actionType === 'update_booth_info') {
        const { error } = await supabase
          .from('booths')
          .update(payload.updateData)
          .eq('id', payload.boothId);
        if (error) throw error;
      } else if (actionType === 'confirm_collection') {
        const { error: boothErr } = await supabase
          .from('booths')
          .update({
            last_collected_at: payload.nowStr,
            updated_at: payload.nowStr
          })
          .eq('id', payload.boothId);
        if (boothErr) throw boothErr;

        const { error: colErr } = await supabase
          .from('collections')
          .insert({
            booth_id: payload.boothId,
            collected_at: payload.nowStr,
            amount_collected: payload.pendingRevenue,
            collector_name: 'Admin Auditor'
          });
        if (colErr) throw colErr;
      } else if (actionType === 'refill_paper') {
        const { error } = await supabase
          .from('booths')
          .update({
            paper_prints_remaining: payload.paperMaxVal,
            updated_at: payload.nowStr,
            paper_refilled_at: payload.nowStr
          })
          .eq('id', payload.boothId);
        if (error) throw error;

        // Log refill to maintenance log ledger
        const { error: logErr } = await supabase
          .from('maintenance_logs')
          .insert({
            booth_id: payload.boothId,
            action_type: 'paper_refill',
            details: `Refilled paper roll to max (${payload.paperMaxVal} prints).`,
            performed_by: 'Admin Console'
          });
        if (logErr) console.warn('[Cloud Admin] Failed to log paper refill:', logErr);
      } else if (actionType === 'bulk_collect') {
        const { error } = await supabase
          .from('booths')
          .update({
            last_collected_at: payload.nowStr,
            updated_at: payload.nowStr
          });
        if (error) throw error;
      }
    } catch (err) {
      console.warn(`[Cloud Admin] Write failed, queueing offline action for ${actionType}:`, err);
      
      const queue = JSON.parse(localStorage.getItem('admin_offline_actions_queue') || '[]');
      queue.push({ id: Math.random().toString(36).substring(2), actionType, payload, timestamp: new Date().toISOString() });
      localStorage.setItem('admin_offline_actions_queue', JSON.stringify(queue));
      
      // Optimistically update local caches
      if (actionType === 'update_booth_info') {
        const cachedBooths = localStorage.getItem('admin_cached_booths');
        if (cachedBooths) {
          const booths = JSON.parse(cachedBooths) as any[];
          const idx = booths.findIndex(x => x.id === payload.boothId);
          if (idx !== -1) {
            booths[idx] = { ...booths[idx], ...payload.updateData };
            localStorage.setItem('admin_cached_booths', JSON.stringify(booths));
          }
        }
      } else if (actionType === 'confirm_collection') {
        const cachedBooths = localStorage.getItem('admin_cached_booths');
        if (cachedBooths) {
          const booths = JSON.parse(cachedBooths) as any[];
          const idx = booths.findIndex(x => x.id === payload.boothId);
          if (idx !== -1) {
            booths[idx].last_collected_at = payload.nowStr;
            localStorage.setItem('admin_cached_booths', JSON.stringify(booths));
          }
        }
        const cachedCol = localStorage.getItem('admin_cached_collections');
        if (cachedCol) {
          const cols = JSON.parse(cachedCol) as any[];
          cols.unshift({
            id: 'temp-' + Math.random(),
            booth_id: payload.boothId,
            collected_at: payload.nowStr,
            amount_collected: payload.pendingRevenue,
            collector_name: 'Admin Auditor (Offline)'
          });
          localStorage.setItem('admin_cached_collections', JSON.stringify(cols.slice(0, 5)));
        }
      } else if (actionType === 'refill_paper') {
        const cachedBooths = localStorage.getItem('admin_cached_booths');
        if (cachedBooths) {
          const booths = JSON.parse(cachedBooths) as any[];
          const idx = booths.findIndex(x => x.id === payload.boothId);
          if (idx !== -1) {
            booths[idx].paper_prints_remaining = payload.paperMaxVal;
            localStorage.setItem('admin_cached_booths', JSON.stringify(booths));
          }
        }
      } else if (actionType === 'bulk_collect') {
        const cachedBooths = localStorage.getItem('admin_cached_booths');
        if (cachedBooths) {
          const booths = JSON.parse(cachedBooths) as any[];
          booths.forEach(b => {
            b.last_collected_at = payload.nowStr;
          });
          localStorage.setItem('admin_cached_booths', JSON.stringify(booths));
        }
      }
      
      this.isOfflineMode = true;
      alert('You are currently offline. This update has been saved locally and will sync once connection returns!');
    }
  }

  private async syncOfflineActionsQueue(): Promise<void> {
    const queueStr = localStorage.getItem('admin_offline_actions_queue');
    if (!queueStr) return;
    
    const queue = JSON.parse(queueStr) as any[];
    if (queue.length === 0) return;
    
    console.log(`[Cloud Admin] Syncing ${queue.length} pending offline actions...`);
    const remainingActions = [];
    
    for (const action of queue) {
      try {
        if (action.actionType === 'update_booth_info') {
          const { error } = await supabase
            .from('booths')
            .update(action.payload.updateData)
            .eq('id', action.payload.boothId);
          if (error) throw error;
        } else if (action.actionType === 'confirm_collection') {
          const { error: boothErr } = await supabase
            .from('booths')
            .update({
              last_collected_at: action.payload.nowStr,
              updated_at: action.payload.nowStr
            })
            .eq('id', action.payload.boothId);
          if (boothErr) throw boothErr;

          const { error: colErr } = await supabase
            .from('collections')
            .insert({
              booth_id: action.payload.boothId,
              collected_at: action.payload.nowStr,
              amount_collected: action.payload.pendingRevenue,
              collector_name: 'Admin Auditor'
            });
          if (colErr) throw colErr;
        } else if (action.actionType === 'refill_paper') {
          const { error } = await supabase
            .from('booths')
            .update({
              paper_prints_remaining: action.payload.paperMaxVal,
              updated_at: action.payload.nowStr,
              paper_refilled_at: action.payload.nowStr
            })
            .eq('id', action.payload.boothId);
          if (error) throw error;

          const { error: logErr } = await supabase
            .from('maintenance_logs')
            .insert({
              booth_id: action.payload.boothId,
              action_type: 'paper_refill',
              details: `Refilled paper roll to max (${action.payload.paperMaxVal} prints).`,
              performed_by: 'Admin Console (Offline Sync)'
            });
          if (logErr) console.warn('[Cloud Admin] Failed to log paper refill on sync:', logErr);
        } else if (action.actionType === 'bulk_collect') {
          const { error } = await supabase
            .from('booths')
            .update({
              last_collected_at: action.payload.nowStr,
              updated_at: action.payload.nowStr
            });
          if (error) throw error;
        }
      } catch (err) {
        console.error('[Cloud Admin] Sync action failed, keeping in queue:', err);
        remainingActions.push(action);
      }
    }
    
    localStorage.setItem('admin_offline_actions_queue', JSON.stringify(remainingActions));
    if (remainingActions.length === 0) {
      console.log('[Cloud Admin] Offline queue sync successful!');
    }
  }

  private getOfflineBannerHtml(): string {
    if (!this.isOfflineMode) return '';
    const cacheTimeStr = this.lastCacheTime ? ` as of ${this.lastCacheTime}` : '';
    return `
      <div class="offline-banner" style="background: #fff9db; border: 1px solid #ffe066; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: center; justify-content: space-between; color: #856404; font-size: 13.5px; box-sizing: border-box; width: 100%;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span>⚠️</span>
          <span><strong>Offline Mode</strong> — Displaying cached dashboard data${cacheTimeStr}. Trying to reconnect...</span>
        </div>
        <button id="btn-offline-retry" class="btn" style="padding: 6px 12px; font-size: 11px; background: rgba(0,0,0,0.05); color: #856404; border: 1px solid rgba(0,0,0,0.1); border-radius: 6px; cursor: pointer; text-transform: none; font-family: inherit;">
          Retry Connection
        </button>
      </div>
    `;
  }

  private async loadTabContent(): Promise<void> {
    const contentBody = this.container.querySelector('#portal-content') as HTMLElement;
    if (!contentBody) return;

    // Trigger tab transition out
    contentBody.classList.add('tab-transitioning-out');
    await new Promise(resolve => setTimeout(resolve, 150));
    contentBody.classList.remove('tab-transitioning-out');

    // Update system sync status indicator
    const syncIndicator = this.container.querySelector('.sync-status-indicator');
    if (syncIndicator) {
      if (this.isOfflineMode || !navigator.onLine) {
        syncIndicator.innerHTML = '<span class="status-dot offline" style="background: #e69500; box-shadow: 0 0 8px #e69500;"></span> Offline Mode';
        (syncIndicator as HTMLElement).style.color = '#e69500';
      } else {
        syncIndicator.innerHTML = '<span class="status-dot online"></span> System Connected';
        (syncIndicator as HTMLElement).style.color = '';
      }
    }

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
      } else if (this.currentTab === 'analytics') {
        await this.loadAnalyticsTab(contentBody);
      } else if (this.currentTab === 'booths') {
        await this.loadBoothsTab(contentBody);
      } else if (this.currentTab === 'licenses') {
        await this.loadLicensesTab(contentBody);
      } else if (this.currentTab === 'sessions') {
        await this.loadSessionsTab(contentBody);
      } else if (this.currentTab === 'revenue') {
        await this.loadRevenueTab(contentBody);
      } else if (this.currentTab === 'maintenance') {
        await this.loadMaintenanceTab(contentBody);
      } else if (this.currentTab === 'settings') {
        await this.loadSettingsTab(contentBody);
      }

      // Apply fade-slide-in
      contentBody.classList.add('tab-transitioning-in');
      setTimeout(() => {
        contentBody.classList.remove('tab-transitioning-in');
      }, 300);

      // Bind manual retry connection button if present
      const retryBtn = contentBody.querySelector('#btn-offline-retry');
      retryBtn?.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
          const { error } = await supabase.from('booths').select('id').limit(1);
          if (error) throw error;
          this.isOfflineMode = false;
          alert('Reconnected to Snapceipt Cloud successfully!');
          await this.syncOfflineActionsQueue();
          await this.loadTabContent();
        } catch (err) {
          alert('Still offline. Please check your internet connection and try again.');
        }
      });

    } catch (err) {
      console.error('[Cloud Admin] Tab loading failure:', err);
      
      // If we failed and are offline, switch to cached mode and retry loading tab
      if (!this.isOfflineMode) {
        this.isOfflineMode = true;
        await this.loadTabContent();
        return;
      }

      contentBody.innerHTML = `
        <div class="error-pane" style="padding: 30px; text-align: center; background: #fff5f5; border: 1px solid #ffc9c9; color: #c92a2a; border-radius: 8px;">
          <h3>⚠️ Failed to retrieve database records</h3>
          <p style="margin-top: 8px; font-size: 14px;">Please check Row-Level Security (RLS) configurations or network connectivity.</p>
        </div>
      `;
    }
  }

  private async loadDashboardTab(container: Element): Promise<void> {
    const booths = await this.querySupabase<any[]>('admin_cached_booths', () => supabase.from('booths').select('*'));
    const sessions = await this.querySupabase<any[]>('admin_cached_sessions', () => supabase.from('sessions').select('*'));
    const recentCollections = await this.querySupabase<any[]>('admin_cached_collections', () => supabase.from('collections').select('*').order('collected_at', { ascending: false }).limit(5));

    const totalBooths = booths.length;
    const now = new Date();
    
    // Status counters
    let activeBoothsCount = 0;
    let offlineBoothsCount = 0;
    const alerts: string[] = [];

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

        // Offline alert if no sync in over 24 hours
        const diffHours = diffMs / (1000 * 60 * 60);
        if (diffHours >= 24) {
          const roundedHours = Math.round(diffHours);
          alerts.push(`⚠️ Kiosk '<strong>${b.name}</strong>' (at ${b.location || b.assigned_cafe || 'Unknown'}) has not synced in ${roundedHours} hours.`);
        }
      } else {
        offlineBoothsCount++;
        alerts.push(`⚠️ Kiosk '<strong>${b.name}</strong>' has never synced online.`);
      }
    });

    // Calculate metrics
    const totalSessions = sessions.length;
    const totalPrints = sessions.reduce((sum, s) => sum + (s.prints_count || 0) + (s.additional_prints || 0), 0);
    const totalRevenue = sessions.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
    
    // Field Cash Auditing Summary calculations
    let auditedTotal = recentCollections.reduce((sum, c) => sum + parseFloat(c.amount_collected || 0), 0);
    
    // Calculate total pending collection balance across all kiosks
    let pendingTotal = 0;
    booths.forEach(b => {
      const boothSessions = sessions.filter(s => s.booth_id === b.id);
      const lastCollected = b.last_collected_at ? new Date(b.last_collected_at) : null;
      const pendingSessions = boothSessions.filter(s => !lastCollected || new Date(s.created_at) > lastCollected);
      const pendingRevenue = pendingSessions.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
      pendingTotal += pendingRevenue;
    });

    // Leaderboard café rankings
    const cafeStats: Record<string, { name: string; revenue: number; sessions: number; prints: number }> = {};
    booths.forEach(b => {
      const boothSessions = sessions.filter(s => s.booth_id === b.id);
      const rev = boothSessions.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
      const prt = boothSessions.reduce((sum, s) => sum + (s.prints_count || 0) + (s.additional_prints || 0), 0);
      cafeStats[b.id] = {
        name: b.name,
        revenue: rev,
        sessions: boothSessions.length,
        prints: prt
      };
    });

    const leaderboard = Object.values(cafeStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 3);

    container.innerHTML = this.getOfflineBannerHtml() + `
      <!-- Offline Warnings Panel -->
      ${alerts.length === 0 ? '' : `
        <div style="background: #fff5f5; border: 1px solid #ffe3e3; border-radius: 8px; padding: 15px; margin-bottom: 24px; color: #c92a2a; font-size: 13px; display: flex; flex-direction: column; gap: 8px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
          ${alerts.map(a => `<div style="display: flex; align-items: center; gap: 8px;">${a}</div>`).join('')}
        </div>
      `}

      <div class="metrics-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 24px;">
        <!-- Card 1: Active Kiosks status breakdown -->
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Kiosk Status</span>
            <span class="metric-icon">🏪</span>
          </div>
          <div class="metric-value">${totalBooths} Total</div>
          <div class="metric-subtext">
            <span style="color: #2f9e44; font-weight: bold;">${activeBoothsCount} Active</span> &bull; 
            <span style="color: #e69500; font-weight: bold;">${offlineBoothsCount} Inactive</span>
          </div>
        </div>

        <!-- Card 2: Audited Cash Collected -->
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Audited cash collected</span>
            <span class="metric-icon">🛡️</span>
          </div>
          <div class="metric-value" style="color: #495057;">₱${auditedTotal.toFixed(2)}</div>
          <div class="metric-subtext">Total verified & audited collections</div>
        </div>

        <!-- Card 3: Pending Collection Balance -->
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">pending collection balance</span>
            <span class="metric-icon">💰</span>
          </div>
          <div class="metric-value" style="color: #2f9e44;">₱${pendingTotal.toFixed(2)}</div>
          <div class="metric-subtext" style="font-weight: 600; color: #2b8a3e;">Outstanding cash in booths</div>
        </div>

        <!-- Card 4: Lifetime Sessions -->
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Total Sessions</span>
            <span class="metric-icon">🎞</span>
          </div>
          <div class="metric-value">${totalSessions}</div>
          <div class="metric-subtext">Lifetime completed captures</div>
        </div>

        <!-- Card 5: Lifetime Prints -->
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Total Prints</span>
            <span class="metric-icon">🖨</span>
          </div>
          <div class="metric-value">${totalPrints}</div>
          <div class="metric-subtext">Lifetime copies printed</div>
        </div>

        <!-- Card 6: Grand Total Revenue -->
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Lifetime Revenue</span>
            <span class="metric-icon">📊</span>
          </div>
          <div class="metric-value">₱${totalRevenue.toFixed(2)}</div>
          <div class="metric-subtext">Cumulative gross transaction total</div>
        </div>
      </div>

      <div class="dashboard-details-row" style="display: flex; gap: 24px; width: 100%; box-sizing: border-box;">
        <!-- Top performing cafes leaderboard -->
        <div class="details-card feed-card" style="flex: 1;">
          <h3>🏆 Top Performing Cafés</h3>
          <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">
            ${leaderboard.length === 0 ? '<p style="color: #666;">No café telemetry recorded.</p>' : leaderboard.map((item, idx) => {
              const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
              return `
                <div style="display: flex; justify-content: space-between; align-items: center; background: #f8f9fa; border: 1px solid var(--border-primary); padding: 12px 16px; border-radius: 8px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                  <div style="display: flex; align-items: center; gap: 12px;">
                    <span style="font-size: 20px;">${medal}</span>
                    <div>
                      <strong style="font-size: 14px; color: #212529;">${item.name}</strong>
                      <div style="font-size: 11px; color: #868e96; margin-top: 3px;">
                        ${item.sessions} sessions &bull; ${item.prints} prints
                      </div>
                    </div>
                  </div>
                  <div style="font-size: 16px; font-weight: 700; color: #2f9e44; font-family: monospace;">
                    ₱${item.revenue.toFixed(2)}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Recent Collections Ledger -->
        <div class="details-card feed-card" style="flex: 1;">
          <h3>📜 Recent Cash Collections Ledger</h3>
          <div class="activity-feed">
            ${recentCollections.length === 0 ? '<p style="color: #666; padding: 15px 0;">No cash collections logged yet.</p>' : recentCollections.map(c => {
              const dateStr = new Date(c.collected_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
              const booth = booths.find(b => b.id === c.booth_id);
              return `
                <div class="feed-item" style="font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
                  <div class="item-time">${dateStr}</div>
                  <div class="item-details">
                    <strong>${booth ? booth.name : 'Unknown Booth'}</strong> verified by <em>${c.collector_name || 'Admin'}</em>
                  </div>
                  <div class="item-price" style="color: #2f9e44; font-weight: 700; font-family: monospace;">₱${parseFloat(c.amount_collected).toFixed(2)}</div>
                </div>
              `;
            }).join('')}
          </div>
      </div>
    `;
  }

  private async loadAnalyticsTab(container: Element): Promise<void> {
    const booths = await this.querySupabase<any[]>('admin_cached_booths', () => supabase.from('booths').select('*'));
    const sessions = await this.querySupabase<any[]>('admin_cached_sessions', () => supabase.from('sessions').select('*'));

    const totalSessions = sessions.length;
    const totalPrints = sessions.reduce((sum, s) => sum + (s.prints_count || 0) + (s.additional_prints || 0), 0);
    const totalRevenue = sessions.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
    const aov = totalSessions ? (totalRevenue / totalSessions) : 0;
    const avgPrints = totalSessions ? (totalPrints / totalSessions) : 0;
    const activeKiosks = booths.length;

    // Calculate template popularity breakdown
    const templateCounts: Record<string, number> = {};
    sessions.forEach(s => {
      const tId = s.template_id || 'default';
      templateCounts[tId] = (templateCounts[tId] || 0) + 1;
    });

    const templateNames: Record<string, string> = {
      'comfort-card': 'Comfort Affirmations',
      'film-stack': 'Vintage Film Strip',
      'retro-strip': 'Classic 3-Frame',
      'default': 'Standard 4-Frame Grid',
      'classic': 'Standard 4-Frame Grid'
    };

    const popularities = Object.entries(templateCounts).map(([id, count]) => {
      const name = templateNames[id] || id;
      const pct = Math.round((count / (totalSessions || 1)) * 100);
      return { name, count, pct };
    }).sort((a, b) => b.count - a.count);

    // Daily revenue calculation for past 7 days
    const dailyRevenue: { dateStr: string; amount: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateKey = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const daySessions = sessions.filter(s => {
        const sDate = new Date(s.created_at);
        return sDate.getFullYear() === d.getFullYear() &&
               sDate.getMonth() === d.getMonth() &&
               sDate.getDate() === d.getDate();
      });
      
      const dayAmount = daySessions.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
      dailyRevenue.push({ dateStr: dateKey, amount: dayAmount });
    }

    const maxVal = Math.max(...dailyRevenue.map(d => d.amount), 100);

    // Build SVG trend points
    let points = '';
    let areaPoints = '30,170 ';
    dailyRevenue.forEach((item, idx) => {
      const x = (idx / 6) * 440 + 30;
      const y = 170 - (item.amount / maxVal) * 160;
      points += `${x},${y} `;
      areaPoints += `${x},${y} `;
      if (idx === 6) {
        areaPoints += `${x},170`;
      }
    });

    container.innerHTML = `
      ${this.getOfflineBannerHtml()}
      <div class="analytics-tab-wrapper" style="font-family: 'Space Grotesk', sans-serif;">
        <!-- Metrics Grid -->
        <div class="metrics-grid">
          <div class="metric-card glassmorphic-card">
            <div class="metric-title">Average Order Value (AOV)</div>
            <div class="metric-value" style="color: #007aff;">₱${aov.toFixed(2)}</div>
            <div class="metric-desc">Gross earnings per print transaction</div>
          </div>
          <div class="metric-card glassmorphic-card">
            <div class="metric-title">Avg Prints Per Session</div>
            <div class="metric-value" style="color: #34c759;">${avgPrints.toFixed(1)}</div>
            <div class="metric-desc">Average strips printed by guests</div>
          </div>
          <div class="metric-card glassmorphic-card">
            <div class="metric-title">Active Kiosk Fleet</div>
            <div class="metric-value" style="color: #5856d6;">${activeKiosks}</div>
            <div class="metric-desc">Booths reporting online state</div>
          </div>
        </div>

        <div class="analytics-panels" style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 24px; margin-top: 24px;">
          <!-- Left Panel: SVG Revenue Trend Chart -->
          <div class="glassmorphic-card" style="padding: 24px; position: relative;">
            <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 20px;">Daily Revenue Trend (Past 7 Days)</h3>
            <div class="chart-container" style="width: 100%; height: 220px;">
              <svg viewBox="0 0 500 200" style="width: 100%; height: 100%; overflow: visible;">
                <defs>
                  <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#007aff" stop-opacity="0.25"/>
                    <stop offset="100%" stop-color="#007aff" stop-opacity="0.0"/>
                  </linearGradient>
                </defs>
                <!-- Grid Lines -->
                <line x1="30" y1="10" x2="470" y2="10" stroke="#eee" stroke-dasharray="3"/>
                <line x1="30" y1="90" x2="470" y2="90" stroke="#eee" stroke-dasharray="3"/>
                <line x1="30" y1="170" x2="470" y2="170" stroke="#ccc"/>

                <!-- Area Fill -->
                <polygon points="${areaPoints}" fill="url(#chart-gradient)"/>

                <!-- Line Path -->
                <polyline points="${points}" fill="none" stroke="#007aff" stroke-width="3"/>

                <!-- Nodes -->
                ${dailyRevenue.map((item, idx) => {
                  const x = (idx / 6) * 440 + 30;
                  const y = 170 - (item.amount / maxVal) * 160;
                  return `
                    <g class="chart-node" style="cursor: pointer;">
                      <circle cx="${x}" cy="${y}" r="5" fill="#007aff" stroke="#ffffff" stroke-width="2"/>
                      <text x="${x}" y="${y - 12}" font-size="10" font-weight="700" text-anchor="middle" fill="#000">₱${item.amount.toFixed(0)}</text>
                    </g>
                  `;
                }).join('')}

                <!-- X Axis Labels -->
                ${dailyRevenue.map((item, idx) => {
                  const x = (idx / 6) * 440 + 30;
                  return `<text x="${x}" y="192" font-size="10" text-anchor="middle" fill="#888">${item.dateStr}</text>`;
                }).join('')}
              </svg>
            </div>
          </div>

          <!-- Right Panel: Layout Popularity Breakdown -->
          <div class="glassmorphic-card" style="padding: 24px;">
            <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 20px;">Template Popularity</h3>
            <div class="popularity-list" style="display: flex; flex-direction: column; gap: 18px;">
              ${popularities.length === 0 ? '<p style="color: #888;">No session records captured yet.</p>' : popularities.map(p => `
                <div class="popularity-row" style="display: flex; flex-direction: column; gap: 6px;">
                  <div style="display: flex; justify-content: space-between; font-size: 13.5px; font-weight: 500;">
                    <span>${p.name}</span>
                    <span style="color: #666;">${p.count} (${p.pct}%)</span>
                  </div>
                  <div class="popularity-bar-container" style="background: rgba(0,0,0,0.05); height: 8px; border-radius: 99px; overflow: hidden; width: 100%;">
                    <div style="background: var(--accent-gradient); width: ${p.pct}%; height: 100%; border-radius: 99px;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private async loadMaintenanceTab(container: Element): Promise<void> {
    const booths = await this.querySupabase<any[]>('admin_cached_booths', () => supabase.from('booths').select('*'));
    const maintenanceLogs = await this.querySupabase<any[]>('admin_cached_maintenance_logs', () => 
      supabase.from('maintenance_logs').select('*').order('created_at', { ascending: false })
    );
    const collections = await this.querySupabase<any[]>('admin_cached_collections', () => 
      supabase.from('collections').select('*').order('collected_at', { ascending: false })
    );

    container.innerHTML = `
      ${this.getOfflineBannerHtml()}
      <div class="maintenance-tab-wrapper" style="font-family: 'Space Grotesk', sans-serif;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
          
          <!-- Column 1: Kiosk Refills Log -->
          <div class="glassmorphic-card" style="padding: 24px;">
            <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
              <span>🔧</span> Hardware Maintenance Log
            </h3>
            
            <div class="timeline-ledger" style="display: flex; flex-direction: column; gap: 15px; max-height: 500px; overflow-y: auto; padding-right: 8px;">
              ${maintenanceLogs.length === 0 ? '<p style="color: #888; padding: 15px 0;">No hardware maintenance logs recorded yet.</p>' : maintenanceLogs.map(log => {
                const dateStr = new Date(log.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                const booth = booths.find(b => b.id === log.booth_id);
                return `
                  <div class="timeline-card" style="background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.04); border-radius: 12px; padding: 14px; position: relative;">
                    <div style="font-size: 11px; color: #888; font-family: monospace; margin-bottom: 6px;">${dateStr}</div>
                    <div style="font-size: 13.5px; font-weight: 600; color: #111;">${booth ? booth.name : 'Unknown Booth'}</div>
                    <div style="font-size: 13px; color: #444; margin-top: 4px;">${log.details}</div>
                    <div style="font-size: 11px; color: #666; margin-top: 8px; font-style: italic;">Performed by: ${log.performed_by || 'Staff'}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Column 2: Cash Collections Log -->
          <div class="glassmorphic-card" style="padding: 24px;">
            <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
              <span>💰</span> Financial Collections Audit Log
            </h3>
            
            <div class="timeline-ledger" style="display: flex; flex-direction: column; gap: 15px; max-height: 500px; overflow-y: auto; padding-right: 8px;">
              ${collections.length === 0 ? '<p style="color: #888; padding: 15px 0;">No payment collections logs recorded yet.</p>' : collections.map(col => {
                const dateStr = new Date(col.collected_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                const booth = booths.find(b => b.id === col.booth_id);
                return `
                  <div class="timeline-card" style="background: rgba(47, 158, 68, 0.03); border: 1px solid rgba(47, 158, 68, 0.08); border-radius: 12px; padding: 14px; position: relative;">
                    <div style="font-size: 11px; color: #2f9e44; font-family: monospace; margin-bottom: 6px;">${dateStr}</div>
                    <div style="font-size: 13.5px; font-weight: 600; color: #111; display: flex; justify-content: space-between; align-items: center;">
                      <span>${booth ? booth.name : 'Unknown Booth'}</span>
                      <span style="color: #2f9e44; font-weight: 700; font-family: monospace;">₱${parseFloat(col.amount_collected).toFixed(2)}</span>
                    </div>
                    <div style="font-size: 13px; color: #444; margin-top: 4px;">Payment verification completed successfully.</div>
                    <div style="font-size: 11px; color: #666; margin-top: 8px; font-style: italic;">Audited by: ${col.collector_name || 'Admin'}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

        </div>
      </div>
    `;
  }

  private async loadBoothsTab(container: Element): Promise<void> {
    const booths = await this.querySupabase<any[]>('admin_cached_booths', () => supabase.from('booths').select('*'));
    const sessions = await this.querySupabase<any[]>('admin_cached_sessions', () => supabase.from('sessions').select('*'));

    const now = new Date();

    container.innerHTML = this.getOfflineBannerHtml() + `
      <div class="details-card" style="width: 100%; box-sizing: border-box;">
        <h3>Registered Snapceipt Kiosks</h3>
        <p style="font-size: 13px; color: #666; margin-bottom: 15px; margin-top: -5px;">Select any café row to inspect full details, edit options, or confirm cash/payment collection audits.</p>
        <div class="table-container">
          <table class="portal-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Booth Name</th>
                <th>Location</th>
                <th style="text-align: right;">Price</th>
                <th style="text-align: right;">Profit Split</th>
                <th style="text-align: center;">Sessions</th>
                <th style="text-align: center;">Prints</th>
                <th style="text-align: right;">Payment to be Collected</th>
              </tr>
            </thead>
            <tbody>
              ${booths.map(b => {
                // Online status and paper checks
                let statusClass = 'status-offline';
                let statusLabel = 'Offline';
                
                const paperMax = b.paper_max_prints || 150;
                const paperRemaining = b.paper_prints_remaining !== undefined ? b.paper_prints_remaining : paperMax;
                const paperPercent = (paperRemaining / paperMax) * 100;
                const isPaperLow = paperPercent < 20;

                if (b.last_sync_at) {
                  const lastSync = new Date(b.last_sync_at);
                  const diffMs = now.getTime() - lastSync.getTime();
                  
                  if (diffMs < 10 * 60 * 1000) {
                    if (isPaperLow) {
                      statusClass = 'status-attention';
                      statusLabel = 'Needs Attention (Paper Low)';
                    } else {
                      statusClass = 'status-online';
                      statusLabel = 'Online';
                    }
                  } else if (diffMs < 2 * 60 * 60 * 1000) {
                    statusClass = 'status-attention';
                    statusLabel = 'Needs Attention (Inactive)';
                  } else {
                    statusClass = 'status-offline';
                    statusLabel = 'Offline';
                  }
                }

                // Stats calculations
                const boothSessions = sessions.filter(s => s.booth_id === b.id);
                const totalSessionsCount = boothSessions.length;
                const totalPrintsCount = boothSessions.reduce((sum, s) => sum + parseInt(s.prints_count || 0), 0);

                // Pending Collection Calculations
                const lastCollected = b.last_collected_at ? new Date(b.last_collected_at) : null;
                const pendingSessions = boothSessions.filter(s => !lastCollected || new Date(s.created_at) > lastCollected);
                const pendingRevenue = pendingSessions.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);

                return `
                  <tr class="booth-row-clickable" data-booth-id="${b.id}">
                    <td><span class="status-badge ${statusClass}">${statusLabel}</span></td>
                    <td style="font-weight: 600;">${b.name}</td>
                    <td>${b.location || b.assigned_cafe || 'N/A'}</td>
                    <td class="font-mono" style="text-align: right;">₱${parseFloat(b.pricing_per_session).toFixed(2)}</td>
                    <td class="font-mono" style="text-align: right;">${b.profit_share_percent}% / ${100 - b.profit_share_percent}%</td>
                    <td class="font-mono" style="text-align: center;">${totalSessionsCount}</td>
                    <td class="font-mono" style="text-align: center;">${totalPrintsCount}</td>
                    <td class="font-mono" style="text-align: right; font-weight: 600; color: ${pendingRevenue > 0 ? '#2f9e44' : '#212529'};">₱${pendingRevenue.toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Wire up row clicks to open details drawer
    const rows = container.querySelectorAll('.booth-row-clickable');
    rows.forEach(row => {
      row.addEventListener('click', () => {
        const id = row.getAttribute('data-booth-id');
        const b = booths.find(x => x.id === id);
        if (!b) return;

        const drawer = this.container.querySelector('#admin-detail-drawer') as HTMLElement;

        // Calculate stats
        const boothSessions = sessions.filter(s => s.booth_id === b.id);
        const totalRevenue = boothSessions.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
        const totalSessionsCount = boothSessions.length;
        const totalPrintsCount = boothSessions.reduce((sum, s) => sum + parseInt(s.prints_count || 0), 0);

        // Calculate pending collection
        const lastCollected = b.last_collected_at ? new Date(b.last_collected_at) : null;
        const pendingSessions = boothSessions.filter(s => !lastCollected || new Date(s.created_at) > lastCollected);
        const pendingRevenue = pendingSessions.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);

        // Calculate paper roll stats
        const paperMax = b.paper_max_prints || 150;
        const paperRemaining = b.paper_prints_remaining !== undefined ? b.paper_prints_remaining : paperMax;
        const paperPercent = Math.min(100, Math.max(0, Math.round((paperRemaining / paperMax) * 100)));

        // Populate drawer content
        const drawerTitle = this.container.querySelector('#drawer-title');
        const drawerBody = this.container.querySelector('#drawer-body-content');

        if (drawerTitle) drawerTitle.textContent = b.name;
        if (drawerBody) {
          const lastSyncDateStr = b.last_sync_at ? new Date(b.last_sync_at).toLocaleString() : 'Never';
          const lastCollectedStr = b.last_collected_at 
            ? new Date(b.last_collected_at).toLocaleString() 
            : 'No payment collections audited yet';

          drawerBody.innerHTML = `
            <form id="drawer-cafe-info-form" style="display: flex; flex-direction: column; gap: 15px;">
              <!-- Café Information Card -->
              <div style="background: #f8f9fa; border: 1px solid var(--border-primary); padding: 15px; border-radius: 8px; display: flex; flex-direction: column; gap: 10px;">
                <h4 style="margin: 0; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #495057; border-bottom: 1px solid #e9ecef; padding-bottom: 5px;">🏪 Edit Café Information</h4>
                
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <label style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #868e96;">Café / Booth Name</label>
                  <input type="text" id="drawer-edit-name" value="${b.name || ''}" required style="padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; background: #fff; color: #000; outline: none;"/>
                </div>

                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <label style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #868e96;">Exact Address / Location</label>
                  <input type="text" id="drawer-edit-location" value="${b.location || b.assigned_cafe || ''}" placeholder="Enter physical address..." required style="padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; background: #fff; color: #000; outline: none;"/>
                </div>

                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <label style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #868e96;">Contact Number</label>
                  <input type="text" id="drawer-edit-contact" value="${b.contact_number || ''}" placeholder="e.g. +63 917 123 4567" style="padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; background: #fff; color: #000; outline: none;"/>
                </div>

                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <label style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #868e96;">Important Notes</label>
                  <textarea id="drawer-edit-notes" placeholder="Agreements, schedules, details..." style="padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; min-height: 50px; font-family: inherit; background: #fff; color: #000; resize: vertical;">${b.notes || ''}</textarea>
                </div>
              </div>

              <!-- Config Customization Card -->
              <div style="background: #f8f9fa; border: 1px solid var(--border-primary); padding: 15px; border-radius: 8px; display: flex; flex-direction: column; gap: 10px;">
                <h4 style="margin: 0; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #495057; border-bottom: 1px solid #e9ecef; padding-bottom: 5px;">🔧 Remote Price & Profit Split</h4>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #868e96;">Pricing (₱)</label>
                    <input type="number" id="drawer-edit-price" value="${parseFloat(b.pricing_per_session).toFixed(2)}" required step="1" min="0" style="padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; background: #fff; color: #000; outline: none;"/>
                  </div>
                  <div style="display: flex; flex-direction: column; gap: 4px;">
                    <label style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #868e96;">Split % (Admin)</label>
                    <input type="number" id="drawer-edit-share" value="${b.profit_share_percent}" required step="0.5" min="0" max="100" style="padding: 8px; border: 1px solid #ddd; border-radius: 6px; font-size: 13px; background: #fff; color: #000; outline: none;"/>
                  </div>
                </div>
              </div>

              <button type="submit" id="btn-save-drawer-info" style="background: #000; color: #fff; border: none; font-weight: bold; padding: 12px; border-radius: 6px; cursor: pointer; font-size: 13px; width: 100%;">
                Save Kiosk Settings
              </button>
            </form>

            <div style="display: flex; flex-direction: column; gap: 15px; margin-top: 15px;">
              <!-- Stats Overview Card -->
              <div style="background: #f8f9fa; border: 1px solid var(--border-primary); padding: 15px; border-radius: 8px;">
                <h4 style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #495057; border-bottom: 1px solid #e9ecef; padding-bottom: 5px;">📈 Kiosk Performance Summary</h4>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; text-align: center;">
                  <div>
                    <div style="font-size: 9px; text-transform: uppercase; color: #868e96; font-weight: 600;">Sessions</div>
                    <div style="font-size: 16px; font-weight: 700; font-family: monospace; color: #212529; margin-top: 3px;">${totalSessionsCount}</div>
                  </div>
                  <div>
                    <div style="font-size: 9px; text-transform: uppercase; color: #868e96; font-weight: 600;">Prints</div>
                    <div style="font-size: 16px; font-weight: 700; font-family: monospace; color: #212529; margin-top: 3px;">${totalPrintsCount}</div>
                  </div>
                  <div>
                    <div style="font-size: 9px; text-transform: uppercase; color: #868e96; font-weight: 600;">Total Revenue</div>
                    <div style="font-size: 16px; font-weight: 700; font-family: monospace; color: #2f9e44; margin-top: 3px;">₱${totalRevenue.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <!-- Specs details Card -->
              <div style="background: #f8f9fa; border: 1px solid var(--border-primary); padding: 15px; border-radius: 8px;">
                <h4 style="margin: 0 0 10px 0; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #495057; border-bottom: 1px solid #e9ecef; padding-bottom: 5px;">🔧 Kiosk Hardware & Config</h4>
                <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #868e96;">Device UUID:</span>
                    <span class="font-mono" style="font-size: 11px; font-weight: 600; color: #212529;">${b.id}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #868e96;">App Version:</span>
                    <span class="font-mono" style="font-weight: 600; color: #212529;">v${b.app_version || '1.5.0'}</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #868e96;">Last Sync:</span>
                    <span style="font-weight: 600; color: #212529;">${lastSyncDateStr}</span>
                  </div>
                </div>
              </div>

              <!-- Printer Paper Roll management Card -->
              <div style="background: #f8f9fa; border: 1px solid var(--border-primary); padding: 15px; border-radius: 8px; display: flex; flex-direction: column; gap: 10px;">
                <h4 style="margin: 0; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #495057; border-bottom: 1px solid #e9ecef; padding-bottom: 5px;">🔋 Printer Paper Roll</h4>
                <div style="font-size: 12px; display: flex; flex-direction: column; gap: 8px;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #868e96;">Status:</span>
                    <span style="font-weight: 700; color: ${paperPercent <= 15 ? '#c92a2a' : paperPercent <= 30 ? '#e69500' : '#2f9e44'};">${paperRemaining} / ${paperMax} prints remaining (${paperPercent}%)</span>
                  </div>
                  <div style="background: rgba(0,0,0,0.05); border-radius: 4px; height: 8px; width: 100%; overflow: hidden; margin-top: 4px;">
                    <div style="background: ${paperPercent <= 15 ? '#c92a2a' : paperPercent <= 30 ? '#e69500' : '#1c7ed6'}; height: 100%; width: ${paperPercent}%;"></div>
                  </div>
                  <button type="button" id="drawer-refill-paper-btn" style="background: #1c7ed6; color: white; border: none; font-weight: bold; padding: 8px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; width: 100%; margin-top: 5px;">
                    🔋 Mark Paper Roll as Refilled
                  </button>
                </div>
              </div>

              <!-- Collection Audit Card -->
              <div style="background: #f8f9fa; border: 1px solid var(--border-primary); padding: 15px; border-radius: 8px; display: flex; flex-direction: column; gap: 10px;">
                <h4 style="margin: 0; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #495057; border-bottom: 1px solid #e9ecef; padding-bottom: 5px;">💰 Payment Auditing & Collection</h4>
                <div style="font-size: 13px; display: flex; flex-direction: column; gap: 8px;">
                  <div>
                    <span style="color: #666; font-size: 11px;">LAST AUDITED COLLECTION:</span><br/>
                    <strong>${lastCollectedStr}</strong>
                  </div>
                  <div style="border-top: 1px dashed var(--border-primary); padding-top: 8px; display: flex; justify-content: space-between; align-items: center;">
                    <span style="color: #666; font-weight: 600;">Pending Collection:</span>
                    <span style="font-size: 18px; font-weight: 800; color: #2f9e44; font-family: monospace;">₱${pendingRevenue.toFixed(2)}</span>
                  </div>

                  ${pendingRevenue > 0 ? `
                    <button type="button" id="btn-drawer-collect-confirm" style="background: #2f9e44; color: #fff; border: none; padding: 10px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; margin-top: 10px; width: 100%;">
                      ✓ Confirm Payment Collected
                    </button>
                  ` : `
                    <div style="font-size: 11px; color: #888; text-align: center; margin-top: 5px;">✓ All outstanding revenue has been collected & audited.</div>
                  `}
                </div>
              </div>
            </div>
          `;

          // Bind Café Info form submission
          const cafeInfoForm = drawerBody.querySelector('#drawer-cafe-info-form');
          cafeInfoForm?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const editName = (drawerBody.querySelector('#drawer-edit-name') as HTMLInputElement).value.trim();
            const editLocation = (drawerBody.querySelector('#drawer-edit-location') as HTMLInputElement).value.trim();
            const editContact = (drawerBody.querySelector('#drawer-edit-contact') as HTMLInputElement).value.trim();
            const editNotes = (drawerBody.querySelector('#drawer-edit-notes') as HTMLTextAreaElement).value.trim();
            
            const editPrice = parseFloat((drawerBody.querySelector('#drawer-edit-price') as HTMLInputElement).value) || 30.00;
            const editShare = parseFloat((drawerBody.querySelector('#drawer-edit-share') as HTMLInputElement).value) || 60.00;

            const saveBtn = drawerBody.querySelector('#btn-save-drawer-info') as HTMLButtonElement;
            saveBtn.disabled = true;
            saveBtn.textContent = 'Saving...';

            const updateData = {
              name: editName,
              assigned_cafe: editName,
              location: editLocation,
              contact_number: editContact,
              notes: editNotes,
              pricing_per_session: editPrice,
              profit_share_percent: editShare,
              updated_at: new Date().toISOString()
            };

            await this.executeSupabaseWrite('update_booth_info', { boothId: b.id, updateData });

            saveBtn.disabled = false;
            saveBtn.textContent = 'Save Kiosk Settings';

            alert('Kiosk settings successfully updated remote configurations!');
            await this.loadBoothsTab(container);
          });



          // Bind collection button
          const collectBtn = drawerBody.querySelector('#btn-drawer-collect-confirm');
          collectBtn?.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm(`Confirm collection of ₱${pendingRevenue.toFixed(2)} from ${b.name}?`)) {
              const nowStr = new Date().toISOString();
              
              await this.executeSupabaseWrite('confirm_collection', { boothId: b.id, nowStr, pendingRevenue });

              alert('Successfully recorded collection payment!');
              
              // Close drawer and reload booths list
              const drawer = this.container.querySelector('#admin-detail-drawer') as HTMLElement;
              drawer.classList.remove('active');
              setTimeout(() => {
                drawer.classList.add('hidden');
              }, 300);

              await this.loadBoothsTab(container);
            }
          });

          // Bind paper refill button
          const refillPaperBtn = drawerBody.querySelector('#drawer-refill-paper-btn');
          refillPaperBtn?.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            const paperMaxVal = b.paper_max_prints || 150;
            if (confirm(`Mark paper roll as refilled (reset remaining prints to ${paperMaxVal}) for ${b.name}?`)) {
              const nowStr = new Date().toISOString();
              
              await this.executeSupabaseWrite('refill_paper', { boothId: b.id, paperMaxVal, nowStr });

              alert('Paper status successfully updated and queued for kiosk sync!');
              
              // Close drawer and reload booths list
              const drawer = this.container.querySelector('#admin-detail-drawer') as HTMLElement;
              drawer.classList.remove('active');
              setTimeout(() => {
                drawer.classList.add('hidden');
              }, 300);

              await this.loadBoothsTab(container);
            }
          });
        }

        // Open details drawer
        if (drawer) {
          drawer.classList.remove('hidden');
          void drawer.offsetHeight; // Force reflow
          drawer.classList.add('active');
        }
      });
    });
  }

  private async loadSettingsTab(container: Element): Promise<void> {
    container.innerHTML = this.getOfflineBannerHtml() + `
      <div class="split-layout" style="display: grid; grid-template-columns: 1fr; gap: 24px; width: 100%; box-sizing: border-box;">
        <div class="details-card" style="max-width: 600px;">
          <h3>⚙️ Snapceipt Cloud Settings</h3>
          <p style="font-size: 13px; color: #666; margin-bottom: 25px;">
            Configure global dashboard defaults, manage your administrator account session, or perform bulk auditing procedures.
          </p>

          <div style="display: flex; flex-direction: column; gap: 20px;">
            <!-- Profile Info Section -->
            <div style="background: #f8f9fa; border: 1px solid var(--border-primary); padding: 18px; border-radius: 8px;">
              <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">👤 Admin Account Session</h4>
              <p style="margin: 0 0 10px 0; font-size: 13px; color: #555;">Logged in as: <strong>${this.userSession.user.email}</strong></p>
              <p style="margin: 0; font-size: 11px; color: #888;">Session token expires automatically. Use the sidebar logout action to exit.</p>
            </div>

            <!-- Ledger Defaults Section -->
            <div style="background: #f8f9fa; border: 1px solid var(--border-primary); padding: 18px; border-radius: 8px;">
              <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">⚡ Cloud Ledger Preferences</h4>
              <p style="margin: 0 0 15px 0; font-size: 13px; color: #555;">These preferences apply as default guidelines for calculating new kiosk profit dispersals.</p>
              
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="form-group" style="display: flex; flex-direction: column; gap: 6px;">
                  <label style="font-size: 11px; font-weight: bold; text-transform: uppercase;">Default Share Percent (%)</label>
                  <input type="number" id="settings-default-share" value="60" disabled style="padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; background: #f1f3f5; color: #666;" />
                </div>
                <div class="form-group" style="display: flex; flex-direction: column; gap: 6px;">
                  <label style="font-size: 11px; font-weight: bold; text-transform: uppercase;">Default Pricing (₱)</label>
                  <input type="number" id="settings-default-price" value="30" disabled style="padding: 10px; border: 1px solid #ccc; border-radius: 6px; font-size: 14px; background: #f1f3f5; color: #666;" />
                </div>
              </div>
              <span style="font-size: 11px; color: #888; margin-top: 10px; display: block;">* Remote updates for splits and pricing can be set directly per-booth.</span>
            </div>

            <!-- Bulk Audit Section -->
            <div style="background: #f8f9fa; border: 1px solid var(--border-primary); padding: 18px; border-radius: 8px;">
              <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #e03131;">🚨 Administrative Auditing (Bulk)</h4>
              <p style="margin: 0 0 15px 0; font-size: 13px; color: #555;">Confirm payment collections across all active Pop-up Café locations. This sets the last collection date for all kiosks to the current time, shifting all outstanding balances to collected.</p>
              
              <button type="button" id="btn-settings-bulk-collect" class="btn-primary-action" style="background: #e03131; color: #fff; border: none; padding: 12px 24px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 14px; width: 100%;">
                💰 Confirm All Payments Collected
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Hook events
    const bulkBtn = container.querySelector('#btn-settings-bulk-collect');
    bulkBtn?.addEventListener('click', async () => {
      if (confirm('Are you sure you want to mark ALL registered cafes/booths as collected? This will reset all current pending revenue balances to ₱0.00.')) {
        const nowStr = new Date().toISOString();
        await this.executeSupabaseWrite('bulk_collect', { nowStr });
        alert('Success! All cafés have been marked as payment collected up to the current date.');
        await this.loadSettingsTab(container);
      }
    });
  }

  private async loadLicensesTab(container: Element): Promise<void> {
    const licenses = await this.querySupabase<any[]>('admin_cached_licenses', () => supabase
      .from('licenses')
      .select('*')
      .order('created_at', { ascending: false }));

    container.innerHTML = this.getOfflineBannerHtml() + `
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
    const booths = await this.querySupabase<any[]>('admin_cached_booths', () => supabase.from('booths').select('*'));
    const sessions = await this.querySupabase<any[]>('admin_cached_sessions', () => supabase.from('sessions').select('*'));

    // Set up filter dropdowns
    const boothOptions = booths.map(b => `<option value="${b.id}">${b.name}</option>`).join('');

    container.innerHTML = this.getOfflineBannerHtml() + `
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
        <!-- Pagination Footer -->
        <div class="pagination-container" style="display: flex; justify-content: space-between; align-items: center; padding: 15px 20px; border-top: 1px solid var(--border-primary); margin-top: 10px; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
          <div style="font-size: 13px; color: #666;" id="sessions-pagination-info">
            Showing 0 - 0 of 0 sessions
          </div>
          <div style="display: flex; gap: 8px; align-items: center;">
            <span id="sessions-page-indicator" style="font-size: 13px; color: #495057; margin-right: 8px;">Page 1 of 1</span>
            <button id="btn-sessions-prev" class="btn btn-secondary" style="padding: 6px 12px; font-size: 13px; cursor: pointer;">Previous</button>
            <button id="btn-sessions-next" class="btn btn-secondary" style="padding: 6px 12px; font-size: 13px; cursor: pointer;">Next</button>
          </div>
        </div>
      </div>
    `;

    // Filter and Pagination implementation
    const tableBody = this.container.querySelector('#sessions-table-body') as HTMLElement;
    const boothSelect = this.container.querySelector('#filter-booth-select') as HTMLSelectElement;
    const dateInput = this.container.querySelector('#filter-date-input') as HTMLInputElement;
    const clearBtn = this.container.querySelector('#btn-clear-filters');

    const prevBtn = this.container.querySelector('#btn-sessions-prev') as HTMLButtonElement;
    const nextBtn = this.container.querySelector('#btn-sessions-next') as HTMLButtonElement;
    const pageIndicator = this.container.querySelector('#sessions-page-indicator') as HTMLElement;
    const pageInfo = this.container.querySelector('#sessions-pagination-info') as HTMLElement;

    let currentPage = 1;
    const pageSize = 15;

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

      const totalItems = filtered.length;
      const totalPages = Math.ceil(totalItems / pageSize) || 1;

      // Adjust page bounds
      if (currentPage > totalPages) currentPage = totalPages;
      if (currentPage < 1) currentPage = 1;

      // Slice current page items
      const startIdx = (currentPage - 1) * pageSize;
      const pageItems = filtered.slice(startIdx, startIdx + pageSize);

      // Update indicators
      if (pageIndicator) {
        pageIndicator.textContent = `Page ${currentPage} of ${totalPages}`;
      }

      if (pageInfo) {
        const fromVal = totalItems === 0 ? 0 : startIdx + 1;
        const toVal = Math.min(startIdx + pageSize, totalItems);
        pageInfo.textContent = `Showing ${fromVal} - ${toVal} of ${totalItems} sessions`;
      }

      if (prevBtn) prevBtn.disabled = currentPage === 1;
      if (nextBtn) nextBtn.disabled = currentPage === totalPages;

      if (pageItems.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #666;">No matching session logs.</td></tr>';
        return;
      }

      tableBody.innerHTML = pageItems.map(s => {
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

    boothSelect.addEventListener('change', () => {
      currentPage = 1;
      renderFilteredSessions();
    });

    dateInput.addEventListener('change', () => {
      currentPage = 1;
      renderFilteredSessions();
    });

    clearBtn?.addEventListener('click', () => {
      boothSelect.value = 'all';
      dateInput.value = '';
      currentPage = 1;
      renderFilteredSessions();
    });

    prevBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentPage > 1) {
        currentPage--;
        renderFilteredSessions();
      }
    });

    nextBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      if (currentPage < Math.ceil(sessions.length / pageSize)) {
        currentPage++;
        renderFilteredSessions();
      }
    });

    // Run initial filter render
    renderFilteredSessions();
  }

  private async loadRevenueTab(container: Element): Promise<void> {
    const booths = await this.querySupabase<any[]>('admin_cached_booths', () => supabase.from('booths').select('*'));
    const sessions = await this.querySupabase<any[]>('admin_cached_sessions', () => supabase.from('sessions').select('*'));

    // Find all unique calendar months YYYY-MM
    const monthsSet = new Set<string>();
    sessions.forEach(s => {
      if (s.created_at) {
        const date = new Date(s.created_at);
        const yyyymm = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthsSet.add(yyyymm);
      }
    });
    const monthsList = Array.from(monthsSet).sort().reverse();

    container.innerHTML = this.getOfflineBannerHtml() + `
      <div class="filter-bar" style="margin-bottom: 20px;">
        <div class="filter-group">
          <label>Filter by Month</label>
          <select id="revenue-month-select" style="padding: 10px 16px; border-radius: 6px; border: 1px solid var(--border-primary); font-size: 13px; outline: none; background: white;">
            <option value="all">All Time</option>
            ${monthsList.map(m => {
              const [year, month] = m.split('-');
              const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
              return `<option value="${m}">${monthName}</option>`;
            }).join('')}
          </select>
        </div>
      </div>

      <div class="metrics-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom: 20px;">
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Grand Gross Revenue</span>
            <span class="metric-icon">💰</span>
          </div>
          <div class="metric-value" id="rev-metric-gross">₱0.00</div>
          <div class="metric-subtext">Sum of all Kiosks</div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Snapceipt Profit Share</span>
            <span class="metric-icon">⚡</span>
          </div>
          <div class="metric-value" style="color: #2f9e44;" id="rev-metric-snap">₱0.00</div>
          <div class="metric-subtext">Snapceipt Cloud Ledger Share</div>
        </div>
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-title">Partner Café Share</span>
            <span class="metric-icon">☕</span>
          </div>
          <div class="metric-value" style="color: #1c7ed6;" id="rev-metric-partner">₱0.00</div>
          <div class="metric-subtext">Sum to disperse to café partners</div>
        </div>
      </div>

      <!-- Kiosk splits list -->
      <div class="details-card" style="width: 100%; box-sizing: border-box;">
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
            <tbody id="rev-ledger-body">
              <!-- Filled dynamically by event selection -->
            </tbody>
          </table>
        </div>
      </div>

      <!-- Historical month tracker list -->
      <div class="details-card" style="width: 100%; box-sizing: border-box; margin-top: 24px;">
        <h3>📊 Historical Monthly Earnings Tracker</h3>
        <p style="font-size: 13px; color: #666; margin-bottom: 15px; margin-top: -5px;">Aggregated earnings summary by calendar month.</p>
        <div class="table-container">
          <table class="portal-table">
            <thead>
              <tr>
                <th>Month</th>
                <th style="text-align: center;">Sessions Count</th>
                <th style="text-align: right;">Gross Revenue</th>
                <th style="text-align: right;">Snapceipt Share</th>
                <th style="text-align: right;">Partner Share</th>
              </tr>
            </thead>
            <tbody>
              ${monthsList.length === 0 ? '<tr><td colspan="5" style="text-align:center; padding: 20px;">No historical monthly data.</td></tr>' : monthsList.map(m => {
                const [year, month] = m.split('-');
                const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
                const monthSessions = sessions.filter(s => {
                  const sDate = new Date(s.created_at);
                  return sDate.getFullYear() === parseInt(year) && (sDate.getMonth() + 1) === parseInt(month);
                });
                const mGross = monthSessions.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
                const mSnap = monthSessions.reduce((sum, s) => sum + parseFloat(s.snapceipt_share || 0), 0);
                const mPartner = monthSessions.reduce((sum, s) => sum + parseFloat(s.partner_share || 0), 0);
                return `
                  <tr>
                    <td style="font-weight: 600;">${monthName}</td>
                    <td style="text-align: center;" class="font-mono">${monthSessions.length}</td>
                    <td style="text-align: right; font-weight: 600;" class="font-mono">₱${mGross.toFixed(2)}</td>
                    <td style="text-align: right; color: #2f9e44;" class="font-mono">₱${mSnap.toFixed(2)}</td>
                    <td style="text-align: right; color: #1c7ed6;" class="font-mono">₱${mPartner.toFixed(2)}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    // Filter selectors
    const monthSelect = container.querySelector('#revenue-month-select') as HTMLSelectElement;
    const grossValEl = container.querySelector('#rev-metric-gross') as HTMLElement;
    const snapValEl = container.querySelector('#rev-metric-snap') as HTMLElement;
    const partnerValEl = container.querySelector('#rev-metric-partner') as HTMLElement;
    const ledgerBodyEl = container.querySelector('#rev-ledger-body') as HTMLElement;

    const renderFilteredRevenue = () => {
      const selectedMonth = monthSelect.value;
      
      let filteredSessions = [...sessions];
      if (selectedMonth !== 'all') {
        const [year, month] = selectedMonth.split('-');
        filteredSessions = sessions.filter(s => {
          const sDate = new Date(s.created_at);
          return sDate.getFullYear() === parseInt(year) && (sDate.getMonth() + 1) === parseInt(month);
        });
      }

      // Re-calculate metrics
      const grossTotal = filteredSessions.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0);
      const snapTotal = filteredSessions.reduce((sum, s) => sum + parseFloat(s.snapceipt_share || 0), 0);
      const partnerTotal = filteredSessions.reduce((sum, s) => sum + parseFloat(s.partner_share || 0), 0);

      if (grossValEl) grossValEl.textContent = `₱${grossTotal.toFixed(2)}`;
      if (snapValEl) snapValEl.textContent = `₱${snapTotal.toFixed(2)}`;
      if (partnerValEl) partnerValEl.textContent = `₱${partnerTotal.toFixed(2)}`;

      // Group revenue by Cafe
      const splitByBooth: Record<string, { name: string, gross: number, snap: number, partner: number, sessionsCount: number }> = {};
      
      booths.forEach(b => {
        splitByBooth[b.id] = { name: b.name, gross: 0, snap: 0, partner: 0, sessionsCount: 0 };
      });

      filteredSessions.forEach(s => {
        if (splitByBooth[s.booth_id]) {
          splitByBooth[s.booth_id].gross += parseFloat(s.total_amount || 0);
          splitByBooth[s.booth_id].snap += parseFloat(s.snapceipt_share || 0);
          splitByBooth[s.booth_id].partner += parseFloat(s.partner_share || 0);
          splitByBooth[s.booth_id].sessionsCount++;
        } else {
          if (!splitByBooth['legacy']) {
            splitByBooth['legacy'] = { name: 'Legacy Booth Archive', gross: 0, snap: 0, partner: 0, sessionsCount: 0 };
          }
          splitByBooth['legacy'].gross += parseFloat(s.total_amount || 0);
          splitByBooth['legacy'].snap += parseFloat(s.snapceipt_share || 0);
          splitByBooth['legacy'].partner += parseFloat(s.partner_share || 0);
          splitByBooth['legacy'].sessionsCount++;
        }
      });

      if (ledgerBodyEl) {
        const rows = Object.values(splitByBooth);
        if (rows.length === 0) {
          ledgerBodyEl.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 20px;">No revenue records for this selection.</td></tr>';
        } else {
          ledgerBodyEl.innerHTML = rows.map(r => {
            const boothConfig = booths.find(b => b.name === r.name);
            const splitPercent = boothConfig ? boothConfig.profit_share_percent : 50;
            const splitText = `${splitPercent}% / ${100 - splitPercent}%`;
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
          }).join('');
        }
      }
    };

    monthSelect.addEventListener('change', renderFilteredRevenue);
    renderFilteredRevenue();
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

      /* Sliding Details Drawer */
      .detail-drawer {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        z-index: 1000;
        display: flex;
        justify-content: flex-end;
        pointer-events: none;
      }
      .detail-drawer.hidden {
        display: none !important;
      }
      .drawer-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.4);
        opacity: 0;
        transition: opacity 0.3s ease;
        pointer-events: auto;
      }
      .detail-drawer.active .drawer-overlay {
        opacity: 1;
      }
      .drawer-content {
        position: relative;
        width: 450px;
        max-width: 90%;
        height: 100%;
        background: #fff;
        box-shadow: -5px 0 25px rgba(0, 0, 0, 0.15);
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        flex-direction: column;
        pointer-events: auto;
        color: #333;
      }
      .detail-drawer.active .drawer-content {
        transform: translateX(0);
      }
      .drawer-header {
        padding: 20px;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .drawer-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 700;
        font-family: 'Space Grotesk', sans-serif;
      }
      .drawer-close-btn {
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        color: #aaa;
        transition: color 0.2s;
        padding: 0 5px;
      }
      .drawer-close-btn:hover {
        color: #333;
      }
      .drawer-body {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 20px;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }

      .drawer-section {
        display: flex;
        flex-direction: column;
        gap: 6px;
        border-bottom: 1px solid #f1f3f5;
        padding-bottom: 15px;
      }
      .drawer-section:last-child {
        border-bottom: none;
      }
      .drawer-label {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        color: #868e96;
        letter-spacing: 0.5px;
      }
      .drawer-value {
        font-size: 14px;
        color: #212529;
      }
      .drawer-value.highlight {
        font-size: 18px;
        font-weight: 700;
        font-family: monospace;
      }
      .booth-row-clickable {
        cursor: pointer;
        transition: background-color 0.15s ease;
      }
      .booth-row-clickable:hover {
        background-color: #f1f3f5 !important;
      }

      /* Transitions & Pulsing Status Badges */
      .tab-transitioning-out {
        opacity: 0;
        transform: translateY(-8px);
      }
      .tab-transitioning-in {
        animation: tab-fade-slide-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      }
      @keyframes tab-fade-slide-in {
        from { opacity: 0; transform: translateY(8px); }
        to { opacity: 1; transform: translateY(0); }
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        padding: 4px 10px;
        border-radius: 99px;
        letter-spacing: 0.5px;
      }
      .status-badge::before {
        content: '';
        width: 6px;
        height: 6px;
        border-radius: 50%;
        display: inline-block;
      }
      .status-badge.status-online {
        background: #e6fcf5;
        color: #0ca678;
      }
      .status-badge.status-online::before {
        background: #0ca678;
        box-shadow: 0 0 6px #0ca678;
        animation: pulse-green 1.5s infinite;
      }
      .status-badge.status-attention {
        background: #fff9db;
        color: #f08c00;
      }
      .status-badge.status-attention::before {
        background: #f08c00;
        box-shadow: 0 0 6px #f08c00;
        animation: pulse-yellow 1.5s infinite;
      }
      .status-badge.status-offline {
        background: #f1f3f5;
        color: #868e96;
      }
      .status-badge.status-offline::before {
        background: #868e96;
        box-shadow: 0 0 4px #868e96;
      }

      @keyframes pulse-green {
        0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(12, 166, 120, 0.7); }
        70% { transform: scale(1.1); box-shadow: 0 0 0 4px rgba(12, 166, 120, 0); }
        100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(12, 166, 120, 0); }
      }
      @keyframes pulse-yellow {
        0% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(240, 140, 0, 0.7); }
        70% { transform: scale(1.1); box-shadow: 0 0 0 4px rgba(240, 140, 0, 0); }
        100% { transform: scale(0.9); box-shadow: 0 0 0 0 rgba(240, 140, 0, 0); }
      }
    `;
    document.head.appendChild(styleEl);
  }
}

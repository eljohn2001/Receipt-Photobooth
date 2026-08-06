import { portalDb } from './services/portal-db';
import type { PortalTab, Booth, SessionRecord, AnalyticsSummary, ActivityEvent, PackageConfig, RemoteSettings, NotificationItem } from './types';
import { renderLoginView } from './components/LoginView';
import { renderHeader } from './components/Header';
import { renderSidebar } from './components/Sidebar';
import { renderMobileBottomNav } from './components/MobileBottomNav';
import { renderBottomSheet } from './components/BottomSheet';
import { renderAddBoothModal } from './components/AddBoothModal';
import { renderDashboardView } from './components/DashboardView';
import { renderBoothsView } from './components/BoothsView';
import { renderActivityView } from './components/ActivityView';
import { renderAnalyticsView } from './components/AnalyticsView';
import { renderTransactionsView } from './components/TransactionsView';
import { renderSettingsView } from './components/SettingsView';
import { renderQrPackagesView } from './components/QrPackagesView';
import { renderMonitoringView } from './components/MonitoringView';
import { renderNotificationsView } from './components/NotificationsView';
import { generatePackageQrDataUrl, printPackageQrCard } from './services/qr-generator';
import { exportSessionsToCsv } from './services/export-service';

class ClientPortalApp {
  private activeTab: PortalTab = 'dashboard';
  private selectedBoothId?: string;
  private searchTerm = '';
  private statusFilter = 'all';
  private isDarkTheme = false;
  private isBottomSheetOpen = false;
  private isAddBoothModalOpen = false;
  private loginError?: string;

  private booths: Booth[] = [];
  private sessions: SessionRecord[] = [];
  private activityEvents: ActivityEvent[] = [];
  private analytics!: AnalyticsSummary;
  private packages: PackageConfig[] = [];
  private remoteSettings!: RemoteSettings;
  private notifications: NotificationItem[] = [];

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    console.log('[ClientPortal] Starting Snapreceipt Client Portal...');
    if (portalDb.isAuthenticated()) {
      await this.loadData();
    }
    this.render();
  }

  private async loadData(): Promise<void> {
    this.booths = await portalDb.getBooths();
    this.sessions = await portalDb.getSessions();
    this.activityEvents = await portalDb.getActivityEvents();
    this.analytics = await portalDb.getAnalyticsSummary();
    this.packages = portalDb.getPackages();
    this.remoteSettings = portalDb.getRemoteSettings();
    this.notifications = portalDb.getNotifications();
  }

  private render(): void {
    const rootEl = document.getElementById('portal-app');
    if (!rootEl) return;

    if (this.isDarkTheme) {
      document.body.classList.add('portal-dark-theme');
    } else {
      document.body.classList.remove('portal-dark-theme');
    }

    if (!portalDb.isAuthenticated()) {
      rootEl.innerHTML = renderLoginView(this.loginError);
      this.attachLoginEventListeners();
      return;
    }

    const activeOrg = portalDb.getActiveOrg();
    const activeBranch = portalDb.getActiveBranch();
    const unreadCount = this.notifications.filter(n => !n.read).length;

    let viewContentHtml = '';

    switch (this.activeTab) {
      case 'dashboard':
        viewContentHtml = renderDashboardView(this.booths, this.sessions, this.analytics);
        break;
      case 'booths':
        viewContentHtml = renderBoothsView(this.booths, this.selectedBoothId);
        break;
      case 'activity':
        viewContentHtml = renderActivityView(this.activityEvents);
        break;
      case 'analytics':
        viewContentHtml = renderAnalyticsView(this.analytics);
        break;
      case 'transactions':
        viewContentHtml = renderTransactionsView(this.sessions, this.searchTerm, this.statusFilter);
        break;
      case 'settings':
        viewContentHtml = renderSettingsView(this.remoteSettings);
        break;
      case 'qr-packages':
        viewContentHtml = renderQrPackagesView(this.packages);
        break;
      case 'monitoring':
        viewContentHtml = renderMonitoringView(this.booths);
        break;
      case 'notifications':
        viewContentHtml = renderNotificationsView(this.notifications);
        break;
      case 'help':
        viewContentHtml = `
          <div class="help-view">
            <div class="page-header">
              <div class="page-title-group">
                <h1>Help & Partner Support</h1>
                <p>Contact 24/7 Snapreceipt™ support or view platform documentation.</p>
              </div>
            </div>
            <div class="card-panel">
              <h2 style="font-size: 16px; font-weight: 700; margin-bottom: 8px;">24/7 Priority Support</h2>
              <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">Our team is available round-the-clock for hardware emergency dispatch and cloud sync assistance.</p>
              <div style="font-family: var(--font-mono); font-size: 14px; font-weight: 700; color: var(--accent-primary);">📞 Hotline: +63 (02) 8888-SNAP</div>
              <div style="font-size: 13px; color: var(--text-tertiary); margin-top: 4px;">✉️ Email: support@photoreceipt.stoodioph.com</div>
            </div>
          </div>
        `;
        break;
      default:
        viewContentHtml = renderDashboardView(this.booths, this.sessions, this.analytics);
    }

    rootEl.innerHTML = `
      <div class="portal-root">
        ${renderSidebar(this.activeTab, unreadCount)}
        <div class="portal-main">
          ${renderHeader(activeOrg, activeBranch, unreadCount)}
          <main class="portal-view-container">
            ${viewContentHtml}
          </main>
        </div>
        ${renderMobileBottomNav(this.activeTab)}
        ${renderBottomSheet(this.isBottomSheetOpen)}
        ${renderAddBoothModal(this.isAddBoothModalOpen, activeOrg.name)}
      </div>
    `;

    this.attachEventListeners();
    this.postRenderActions();
  }

  private attachLoginEventListeners(): void {
    const loginForm = document.getElementById('form-portal-login') as HTMLFormElement;
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const emailInput = document.getElementById('login-email') as HTMLInputElement;
        const passInput = document.getElementById('login-password') as HTMLInputElement;

        if (emailInput && passInput) {
          const success = portalDb.login(emailInput.value, passInput.value);
          if (success) {
            this.loginError = undefined;
            await this.loadData();
            this.render();
          } else {
            this.loginError = 'Invalid partner credentials. Please check your email or org slug.';
            this.render();
          }
        }
      });
    }

    document.querySelectorAll('.btn-demo-login').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const orgId = (e.currentTarget as HTMLElement).getAttribute('data-org-id');
        if (orgId) {
          portalDb.loginAsOrg(orgId);
          this.loginError = undefined;
          await this.loadData();
          this.render();
        }
      });
    });
  }

  private attachEventListeners(): void {
    // Logout (Header & Sheet)
    const logoutBtn = document.getElementById('btn-portal-logout') || document.getElementById('btn-portal-logout-sheet');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        portalDb.logout();
        this.render();
      });
    }

    // Theme Toggle (Sheet)
    const sheetThemeBtn = document.getElementById('btn-theme-toggle-sheet');
    if (sheetThemeBtn) {
      sheetThemeBtn.addEventListener('click', () => {
        this.isDarkTheme = !this.isDarkTheme;
        this.render();
      });
    }

    // Notifications (Sheet)
    const sheetNotifBtn = document.getElementById('btn-notif-sheet');
    if (sheetNotifBtn) {
      sheetNotifBtn.addEventListener('click', () => {
        this.activeTab = 'notifications';
        this.isBottomSheetOpen = false;
        this.render();
      });
    }

    // Desktop Navigation
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = (e.currentTarget as HTMLElement).getAttribute('data-tab') as PortalTab;
        if (tab) {
          this.activeTab = tab;
          this.isBottomSheetOpen = false;
          this.selectedBoothId = undefined;
          this.render();
        }
      });
    });

    // Mobile Navigation
    document.querySelectorAll('.mobile-pill-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = (e.currentTarget as HTMLElement).getAttribute('data-mobile-tab') as PortalTab;
        if (tab === 'more') {
          this.isBottomSheetOpen = !this.isBottomSheetOpen;
          this.render();
        } else if (tab) {
          this.activeTab = tab;
          this.isBottomSheetOpen = false;
          this.selectedBoothId = undefined;
          this.render();
        }
      });
    });

    // Bottom Sheet Items Click
    document.querySelectorAll('.sheet-item-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = (e.currentTarget as HTMLElement).getAttribute('data-sheet-tab') as PortalTab;
        if (tab) {
          this.activeTab = tab;
          this.isBottomSheetOpen = false;
          this.selectedBoothId = undefined;
          this.render();
        }
      });
    });

    // Dismiss Bottom Sheet
    const sheetOverlay = document.getElementById('ios-bottom-sheet');
    if (sheetOverlay) {
      sheetOverlay.addEventListener('click', (e) => {
        if (e.target === sheetOverlay) {
          this.isBottomSheetOpen = false;
          this.render();
        }
      });
    }

    // Open Add Booth Modal
    const openAddBoothBtn = document.getElementById('btn-open-add-booth-modal') || document.getElementById('btn-open-add-booth-modal-empty');
    if (openAddBoothBtn) {
      openAddBoothBtn.addEventListener('click', () => {
        this.isAddBoothModalOpen = true;
        this.render();
      });
    }

    // Close Add Booth Modal
    const closeAddBoothBtn = document.getElementById('btn-cancel-add-booth') || document.getElementById('btn-close-add-booth');
    if (closeAddBoothBtn) {
      closeAddBoothBtn.addEventListener('click', () => {
        this.isAddBoothModalOpen = false;
        this.render();
      });
    }

    // Dismiss Add Booth Modal Backdrop
    const addBoothOverlay = document.getElementById('add-booth-modal-overlay');
    if (addBoothOverlay) {
      addBoothOverlay.addEventListener('click', (e) => {
        if (e.target === addBoothOverlay) {
          this.isAddBoothModalOpen = false;
          this.render();
        }
      });
    }

    // Request Key from Admin
    const reqKeyBtn = document.getElementById('btn-request-license-key');
    if (reqKeyBtn) {
      reqKeyBtn.addEventListener('click', () => {
        const keyInput = document.getElementById('add-booth-key') as HTMLInputElement;
        const activeOrg = portalDb.getActiveOrg();
        const sampleKey = `ACT-${activeOrg.slug.toUpperCase().replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
        if (keyInput) keyInput.value = sampleKey;
        alert(`📩 License Request sent to Snapreceipt Admin!\nAdmin issued Activation Key: ${sampleKey}`);
      });
    }

    // Submit Add Booth Form
    const addBoothForm = document.getElementById('form-add-booth') as HTMLFormElement;
    if (addBoothForm) {
      const modelSelect = document.getElementById('add-booth-model') as HTMLSelectElement;
      const pricingSelect = document.getElementById('add-booth-pricing-mode') as HTMLSelectElement;
      const priceGroup = document.getElementById('group-booth-price');

      if (pricingSelect && priceGroup) {
        pricingSelect.addEventListener('change', () => {
          if (pricingSelect.value === 'free') {
            priceGroup.style.display = 'none';
          } else {
            priceGroup.style.display = 'flex';
          }
        });
      }

      addBoothForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('add-booth-name') as HTMLInputElement;
        const branchInput = document.getElementById('add-booth-branch') as HTMLInputElement;
        const locationInput = document.getElementById('add-booth-location') as HTMLInputElement;
        const priceInput = document.getElementById('add-booth-price') as HTMLInputElement;
        const keyInput = document.getElementById('add-booth-key') as HTMLInputElement;

        const businessModel = (modelSelect?.value || 'profit_share') as 'profit_share' | 'flat_rental';
        const isFreeEventMode = pricingSelect?.value === 'free';
        const rawPrice = parseFloat(priceInput?.value) || 99;

        if (nameInput && branchInput && locationInput && keyInput) {
          const createdBooth = portalDb.addBooth({
            name: nameInput.value,
            branch: branchInput.value,
            location: locationInput.value,
            price: isFreeEventMode ? 0 : rawPrice,
            key: keyInput.value,
            businessModel,
            isFreeEventMode
          });

          this.notifications.unshift({
            id: `notif-add-${Date.now()}`,
            boothName: createdBooth.name,
            type: 'warning',
            title: 'New Booth Registered (Pending Activation)',
            message: `Activation key ${keyInput.value} assigned. Waiting for physical kiosk tablet pairing.`,
            timestamp: new Date().toISOString(),
            read: false
          });

          this.isAddBoothModalOpen = false;
          await this.loadData();
          alert(`🎉 Success! Branch '${createdBooth.name}' has been registered in Pending Activation state.\n\nActivation Key: ${keyInput.value}\n\nEnter this key on your physical tablet app screen to pair telemetry.`);
          this.render();
        }
      });
    }

    // Organization Switcher
    const tenantSelect = document.getElementById('select-portal-tenant') as HTMLSelectElement;
    if (tenantSelect) {
      tenantSelect.addEventListener('change', async () => {
        portalDb.setActiveOrg(tenantSelect.value);
        this.selectedBoothId = undefined;
        await this.loadData();
        this.render();
      });
    }

    // Branch Switcher
    const branchSelect = document.getElementById('select-portal-branch') as HTMLSelectElement;
    if (branchSelect) {
      branchSelect.addEventListener('change', async () => {
        portalDb.setActiveBranch(branchSelect.value);
        this.selectedBoothId = undefined;
        await this.loadData();
        this.render();
      });
    }

    // Theme Toggle
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        this.isDarkTheme = !this.isDarkTheme;
        this.render();
      });
    }

    // Notification Bell
    const notifBtn = document.getElementById('btn-portal-notif');
    if (notifBtn) {
      notifBtn.addEventListener('click', () => {
        this.activeTab = 'notifications';
        this.isBottomSheetOpen = false;
        this.render();
      });
    }

    // Dashboard Refresh
    const refreshDashBtn = document.getElementById('btn-refresh-dash');
    if (refreshDashBtn) {
      refreshDashBtn.addEventListener('click', async () => {
        await this.loadData();
        this.render();
      });
    }

    // Booth Detail Modal Cards Click
    document.querySelectorAll('.booth-card').forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-booth-id');
        if (id) {
          this.selectedBoothId = id;
          this.render();
        }
      });
    });

    // Close Booth Detail Modal Button
    const closeModalBtn = document.getElementById('btn-close-booth-modal');
    if (closeModalBtn) {
      closeModalBtn.addEventListener('click', () => {
        this.selectedBoothId = undefined;
        this.render();
      });
    }

    // Dismiss Booth Detail Modal Overlay Backdrop
    const detailModalOverlay = document.getElementById('booth-detail-modal');
    if (detailModalOverlay) {
      detailModalOverlay.addEventListener('click', (e) => {
        if (e.target === detailModalOverlay) {
          this.selectedBoothId = undefined;
          this.render();
        }
      });
    }

    // Paper Refill
    const refillBtn = document.getElementById('btn-refill-booth');
    if (refillBtn && this.selectedBoothId) {
      refillBtn.addEventListener('click', () => {
        const b = this.booths.find(bo => bo.id === this.selectedBoothId);
        if (b) {
          b.paperPrintsRemaining = b.paperMaxPrints;
          b.telemetry.paperPrintsRemaining = b.paperMaxPrints;
          b.telemetry.paperRemainingPercent = 100;
          b.telemetry.printerStatus = 'ready';
          alert(`Successfully refilled paper roll for ${b.name}! Counter reset to ${b.paperMaxPrints} prints.`);
          this.render();
        }
      });
    }

    // Force Activate Booth
    const forceActivateBtn = document.getElementById('btn-force-activate-booth');
    if (forceActivateBtn && this.selectedBoothId) {
      forceActivateBtn.addEventListener('click', async () => {
        portalDb.activateBooth(this.selectedBoothId!);
        await this.loadData();
        this.render();
      });
    }

    // Ping Booth
    const pingBtn = document.getElementById('btn-ping-booth');
    if (pingBtn && this.selectedBoothId) {
      pingBtn.addEventListener('click', () => {
        alert(`Diagnostic Ping sent to physical kiosk. Response: 200 OK (Latency: 18ms).`);
      });
    }

    // Delete Booth Branch
    const deleteBoothBtn = document.getElementById('btn-delete-booth-detail');
    if (deleteBoothBtn && this.selectedBoothId) {
      deleteBoothBtn.addEventListener('click', async () => {
        const b = this.booths.find(bo => bo.id === this.selectedBoothId);
        if (b && confirm(`Are you sure you want to delete booth branch '${b.name}'?\n\nThis will remove its telemetry registration from your client portal.`)) {
          portalDb.deleteBooth(b.id);
          this.selectedBoothId = undefined;
          await this.loadData();
          alert(`🗑️ Booth branch '${b.name}' has been deleted.`);
          this.render();
        }
      });
    }

    // Transaction Search & Filter
    const txSearchInput = document.getElementById('input-tx-search') as HTMLInputElement;
    if (txSearchInput) {
      txSearchInput.addEventListener('input', () => {
        this.searchTerm = txSearchInput.value;
        this.render();
      });
    }

    const txStatusSelect = document.getElementById('select-tx-status') as HTMLSelectElement;
    if (txStatusSelect) {
      txStatusSelect.addEventListener('change', () => {
        this.statusFilter = txStatusSelect.value;
        this.render();
      });
    }

    // Delete Transaction Session
    document.querySelectorAll('.btn-delete-session').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const sessId = (e.currentTarget as HTMLElement).getAttribute('data-session-id');
        if (sessId && confirm(`Are you sure you want to delete transaction record #${sessId}?`)) {
          portalDb.deleteSession(sessId);
          await this.loadData();
          this.render();
        }
      });
    });

    // Delete Activity Event
    document.querySelectorAll('.btn-delete-activity').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const evtId = (e.currentTarget as HTMLElement).getAttribute('data-event-id');
        if (evtId && confirm(`Are you sure you want to delete this activity log event?`)) {
          portalDb.deleteActivityEvent(evtId);
          await this.loadData();
          this.render();
        }
      });
    });

    // CSV Export
    const csvExportBtn = document.getElementById('btn-export-csv');
    if (csvExportBtn) {
      csvExportBtn.addEventListener('click', () => {
        exportSessionsToCsv(this.sessions, portalDb.getActiveOrg().name);
      });
    }

    // Save Remote Settings
    const saveSettingsBtn = document.getElementById('btn-save-remote-settings');
    if (saveSettingsBtn) {
      saveSettingsBtn.addEventListener('click', () => {
        alert('Remote configuration saved! Payload successfully queued for booth sync.');
      });
    }

    // Mark Notifications Read
    const markReadBtn = document.getElementById('btn-mark-all-read');
    if (markReadBtn) {
      markReadBtn.addEventListener('click', () => {
        this.notifications.forEach(n => n.read = true);
        this.render();
      });
    }

    // QR Package Downloads & Prints
    document.querySelectorAll('.btn-download-qr').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const pkgId = (e.currentTarget as HTMLElement).getAttribute('data-pkg-id');
        const pkg = this.packages.find(p => p.id === pkgId);
        if (pkg) {
          const url = await generatePackageQrDataUrl(pkg.qrData);
          const link = document.createElement('a');
          link.href = url;
          link.download = `QR_${pkg.name.replace(/\s+/g, '_')}.png`;
          link.click();
        }
      });
    });

    document.querySelectorAll('.btn-print-qr').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const pkgId = (e.currentTarget as HTMLElement).getAttribute('data-pkg-id');
        const pkg = this.packages.find(p => p.id === pkgId);
        if (pkg) {
          const url = await generatePackageQrDataUrl(pkg.qrData);
          printPackageQrCard(pkg.name, pkg.price, url);
        }
      });
    });
  }

  private async postRenderActions(): Promise<void> {
    if (this.activeTab === 'qr-packages') {
      for (const pkg of this.packages) {
        const holder = document.getElementById(`qr-container-${pkg.id}`);
        if (holder) {
          const qrDataUrl = await generatePackageQrDataUrl(pkg.qrData);
          if (qrDataUrl) {
            holder.innerHTML = `<img src="${qrDataUrl}" alt="${pkg.name} QR Code" style="width: 180px; height: 180px; border-radius: 8px;" />`;
          }
        }
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new ClientPortalApp();
});

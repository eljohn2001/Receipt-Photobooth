import { supabase } from '../../services/supabase';
import type { 
  Organization, 
  Booth, 
  SessionRecord, 
  ActivityEvent, 
  PackageConfig, 
  RemoteSettings, 
  NotificationItem, 
  AnalyticsSummary 
} from '../types';

const STORAGE_SESSION_KEY = 'snapreceipt_portal_session_v4';
const STORAGE_ORGS_KEY = 'snapreceipt_portal_orgs_v4';
const STORAGE_BOOTHS_KEY = 'snapreceipt_portal_custom_booths_v4';

export class PortalDatabaseService {
  private organizations: Organization[] = [];
  private activeOrg: Organization = {
    id: 'org_partner_default',
    name: 'Partner Account',
    slug: 'partner-account',
    contactEmail: 'partner@snapreceipt.ph',
    contactPhone: '+63 900 000 0000',
    plan: 'enterprise',
    branches: ['All Locations']
  };
  private activeBranch: string = 'All Locations';
  private customBoothsByOrg: Record<string, Booth[]> = {};

  constructor() {
    this.loadPersistedOrgs();
    this.loadPersistedBooths();
    this.restoreSession();
  }

  private loadPersistedOrgs(): void {
    try {
      const stored = localStorage.getItem(STORAGE_ORGS_KEY);
      if (stored) {
        this.organizations = JSON.parse(stored);
      } else {
        this.organizations = [];
      }
    } catch (e) {
      this.organizations = [];
    }
    if (this.organizations.length > 0) {
      this.activeOrg = this.organizations[0];
    }
  }

  private saveOrgs(): void {
    try {
      localStorage.setItem(STORAGE_ORGS_KEY, JSON.stringify(this.organizations));
    } catch (e) {
      console.warn('[PortalDB] Failed to save orgs:', e);
    }
  }

  private loadPersistedBooths(): void {
    try {
      const stored = localStorage.getItem(STORAGE_BOOTHS_KEY);
      if (stored) {
        this.customBoothsByOrg = JSON.parse(stored);
      } else {
        this.customBoothsByOrg = {};
      }
    } catch (e) {
      this.customBoothsByOrg = {};
    }
  }

  private saveBooths(): void {
    try {
      localStorage.setItem(STORAGE_BOOTHS_KEY, JSON.stringify(this.customBoothsByOrg));
    } catch (e) {
      console.warn('[PortalDB] Failed to save custom booths:', e);
    }
  }

  public getOrganizations(): Organization[] {
    return this.organizations;
  }

  public createOrganization(data: { name: string; contactEmail: string; contactPhone: string; plan: 'basic' | 'pro' | 'enterprise'; branchName: string }): { org: Organization; apiKey: string; activationKey: string } {
    const slug = data.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const id = `org_${slug}`;
    const apiKey = `KEY_${slug.toUpperCase().replace(/-/g, '')}_LIVE_${Math.floor(1000 + Math.random() * 9000)}`;
    const activationKey = `ACT-${slug.toUpperCase().replace(/-/g, '')}-1001`;

    const newOrg: Organization = {
      id,
      name: data.name,
      slug,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
      plan: data.plan,
      branches: ['All Locations', data.branchName || 'Main Branch']
    };

    const existingIdx = this.organizations.findIndex(o => o.id === id);
    if (existingIdx !== -1) {
      this.organizations[existingIdx] = newOrg;
    } else {
      this.organizations.unshift(newOrg);
    }

    this.saveOrgs();
    this.activeOrg = newOrg;

    return { org: newOrg, apiKey, activationKey };
  }

  public deleteOrganization(orgId: string): void {
    this.organizations = this.organizations.filter(o => o.id !== orgId);
    this.saveOrgs();
    if (this.activeOrg.id === orgId && this.organizations.length > 0) {
      this.activeOrg = this.organizations[0];
    }
  }

  public isAuthenticated(): boolean {
    const session = localStorage.getItem(STORAGE_SESSION_KEY);
    return !!session;
  }

  public login(email: string, _pass: string): boolean {
    const matched = this.organizations.find(o => 
      o.contactEmail.toLowerCase() === email.toLowerCase() || 
      o.slug === email.toLowerCase()
    );

    if (matched) {
      this.activeOrg = matched;
      this.activeBranch = 'All Locations';
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify({
        orgId: matched.id,
        email: matched.contactEmail,
        loginTime: new Date().toISOString()
      }));
      return true;
    } else {
      const cleanSlug = (email.split('@')[0] || 'partner').toLowerCase().replace(/[^a-z0-9]/g, '-');
      const deterministicId = `org_${cleanSlug}`;

      const dynamicOrg: Organization = {
        id: deterministicId,
        name: email.split('@')[0] ? (email.split('@')[0].toUpperCase() + ' Café') : 'Partner Account',
        slug: cleanSlug,
        contactEmail: email,
        contactPhone: '+63 900 000 0000',
        plan: 'enterprise',
        branches: ['All Locations', 'Main Branch']
      };

      const idx = this.organizations.findIndex(o => o.id === deterministicId);
      if (idx !== -1) {
        this.organizations[idx] = dynamicOrg;
      } else {
        this.organizations.unshift(dynamicOrg);
      }

      this.saveOrgs();
      this.activeOrg = dynamicOrg;
      this.activeBranch = 'All Locations';
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify({
        orgId: dynamicOrg.id,
        email: dynamicOrg.contactEmail,
        loginTime: new Date().toISOString()
      }));
      return true;
    }
  }

  public loginAsOrg(orgId: string): boolean {
    const matched = this.organizations.find(o => o.id === orgId);
    if (matched) {
      this.activeOrg = matched;
      this.activeBranch = 'All Locations';
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify({
        orgId: matched.id,
        email: matched.contactEmail,
        loginTime: new Date().toISOString()
      }));
      return true;
    }
    return false;
  }

  public logout(): void {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  }

  private restoreSession(): void {
    try {
      const stored = localStorage.getItem(STORAGE_SESSION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        const matched = this.organizations.find(o => o.id === parsed.orgId);
        if (matched) this.activeOrg = matched;
      }
    } catch (e) {
      console.warn('[PortalDB] Failed to restore session:', e);
    }
  }

  public setActiveOrg(orgId: string): Organization {
    const found = this.organizations.find(o => o.id === orgId);
    if (found) {
      this.activeOrg = found;
      this.activeBranch = 'All Locations';
      localStorage.setItem(STORAGE_SESSION_KEY, JSON.stringify({
        orgId: found.id,
        email: found.contactEmail,
        loginTime: new Date().toISOString()
      }));
    }
    return this.activeOrg;
  }

  public getActiveOrg(): Organization {
    return this.activeOrg;
  }

  public setActiveBranch(branch: string): void {
    this.activeBranch = branch;
  }

  public getActiveBranch(): string {
    return this.activeBranch;
  }

  public addBooth(data: { 
    name: string; 
    branch: string; 
    location: string; 
    price: number; 
    key: string;
    businessModel?: 'profit_share' | 'flat_rental';
    isFreeEventMode?: boolean;
    profitSharePercent?: number;
  }): Booth {
    const isRental = data.businessModel === 'flat_rental';
    const isFree = data.isFreeEventMode || false;
    const finalPrice = isFree ? 0 : data.price;
    const finalSplit = isRental ? 100 : (data.profitSharePercent || 60);

    const newBooth: Booth = {
      id: `booth-${data.key.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
      name: data.name,
      assignedCafe: this.activeOrg.name,
      location: data.location,
      branch: data.branch,
      status: 'pending_activation',
      lastSyncAt: 'Never (Awaiting Kiosk Pairing)',
      appVersion: 'v1.5.0 (Pending)',
      activationStatus: 'pending',
      activationKey: data.key,
      businessModel: data.businessModel || 'profit_share',
      isFreeEventMode: isFree,
      pricingPerSession: finalPrice,
      profitSharePercent: finalSplit,
      todayRevenue: 0,
      todaySessions: 0,
      todayPrints: 0,
      paperMaxPrints: 150,
      paperPrintsRemaining: 150,
      paperRefilledAt: new Date().toISOString(),
      currentTheme: 'Classic Thermal',
      activePackageCount: 4,
      telemetry: {
        cameraStatus: 'pending',
        cameraFps: 0,
        printerStatus: 'pending',
        printerModel: 'Awaiting Tablet Pairing',
        paperRemainingPercent: 100,
        paperPrintsRemaining: 150,
        storageUsedGb: 0,
        storageTotalGb: 64,
        memoryUsedMb: 0,
        memoryTotalMb: 4096,
        cpuTempC: 0,
        internetLatencyMs: 0,
        internetType: 'none'
      }
    };

    if (!this.customBoothsByOrg[this.activeOrg.id]) {
      this.customBoothsByOrg[this.activeOrg.id] = [];
    }
    
    // De-duplicate if exists
    this.customBoothsByOrg[this.activeOrg.id] = this.customBoothsByOrg[this.activeOrg.id].filter(b => b.id !== newBooth.id);
    this.customBoothsByOrg[this.activeOrg.id].unshift(newBooth);
    this.saveBooths();

    if (!this.activeOrg.branches.includes(data.branch)) {
      this.activeOrg.branches.push(data.branch);
      this.saveOrgs();
    }

    if (navigator.onLine) {
      void supabase.from('booths').insert({
        id: newBooth.id,
        name: newBooth.name,
        assigned_cafe: newBooth.assignedCafe,
        location: newBooth.location,
        branch: newBooth.branch,
        pricing_per_session: newBooth.pricingPerSession,
        profit_share_percent: newBooth.profitSharePercent,
        status: 'pending_activation',
        last_sync_at: new Date().toISOString()
      }).then(({ error }) => {
        if (error) console.warn('[PortalDB] Supabase booth insert notice:', error);
      });
    }

    return newBooth;
  }

  public deleteBooth(boothId: string): void {
    if (this.customBoothsByOrg[this.activeOrg.id]) {
      this.customBoothsByOrg[this.activeOrg.id] = this.customBoothsByOrg[this.activeOrg.id].filter(b => b.id !== boothId);
      this.saveBooths();
    }

    if (navigator.onLine) {
      void supabase.from('booths').delete().eq('id', boothId).then(({ error }) => {
        if (error) console.warn('[PortalDB] Could not delete booth on Supabase:', error);
      });
    }
  }

  public activateBooth(boothId: string): void {
    const orgBooths = this.customBoothsByOrg[this.activeOrg.id] || [];
    const allCustom = Object.values(this.customBoothsByOrg).flat();
    const target = [...orgBooths, ...allCustom].find(b => b.id === boothId);

    if (target) {
      target.status = 'online';
      target.activationStatus = 'activated';
      target.lastSyncAt = new Date().toISOString();
      target.appVersion = 'v1.5.0';
      target.telemetry = {
        cameraStatus: 'online',
        cameraFps: 30,
        printerStatus: 'ready',
        printerModel: 'ESC/POS Thermal 80mm',
        paperRemainingPercent: 100,
        paperPrintsRemaining: 150,
        storageUsedGb: 14.2,
        storageTotalGb: 64,
        memoryUsedMb: 1420,
        memoryTotalMb: 4096,
        cpuTempC: 44.5,
        internetLatencyMs: 18,
        internetType: 'wifi'
      };
      this.saveBooths();
    }
  }

  public async getBooths(): Promise<Booth[]> {
    let supabaseBooths: Booth[] = [];
    
    try {
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('booths')
          .select('*')
          .ilike('assigned_cafe', `%${this.activeOrg.name}%`);

        if (!error && data && data.length > 0) {
          supabaseBooths = data.map((b: any) => ({
            id: b.id || 'booth-live-1',
            name: b.name || `${this.activeOrg.name} Live Kiosk`,
            assignedCafe: b.assigned_cafe || this.activeOrg.name,
            location: b.location || 'Branch Location',
            branch: b.branch || 'Main',
            status: (Date.now() - new Date(b.last_sync_at || 0).getTime() < 120000) ? 'online' : 'offline',
            lastSyncAt: b.last_sync_at || new Date().toISOString(),
            appVersion: b.app_version || '1.5.0',
            activationStatus: 'activated',
            businessModel: b.business_model || 'profit_share',
            isFreeEventMode: b.is_free_event_mode || false,
            pricingPerSession: parseFloat(b.pricing_per_session) || 99,
            profitSharePercent: parseFloat(b.profit_share_percent) || 60,
            todayRevenue: b.today_revenue || 0,
            todaySessions: b.today_sessions || 0,
            todayPrints: b.today_prints || 0,
            paperMaxPrints: b.paper_max_prints || 150,
            paperPrintsRemaining: b.paper_prints_remaining !== undefined ? b.paper_prints_remaining : 150,
            paperRefilledAt: b.paper_refilled_at || new Date().toISOString(),
            currentTheme: 'Classic Thermal',
            activePackageCount: 4,
            telemetry: {
              cameraStatus: 'online',
              cameraFps: 30,
              printerStatus: (b.paper_prints_remaining || 150) < 20 ? 'low_paper' : 'ready',
              printerModel: 'ESC/POS Thermal 80mm',
              paperRemainingPercent: Math.round(((b.paper_prints_remaining || 150) / 150) * 100),
              paperPrintsRemaining: b.paper_prints_remaining !== undefined ? b.paper_prints_remaining : 150,
              storageUsedGb: 14.2,
              storageTotalGb: 64,
              memoryUsedMb: 1420,
              memoryTotalMb: 4096,
              cpuTempC: 44.5,
              internetLatencyMs: 24,
              internetType: 'wifi'
            }
          }));
        }
      }

      // Check online activation status against Supabase licenses table
      if (navigator.onLine) {
        const { data: licensesData } = await supabase.from('licenses').select('*');
        if (licensesData && licensesData.length > 0) {
          const orgBoothsList = this.customBoothsByOrg[this.activeOrg.id] || [];
          const allCustomList = Object.values(this.customBoothsByOrg).flat();
          const listToCheck = orgBoothsList.length > 0 ? orgBoothsList : allCustomList;

          let hasUpdated = false;
          listToCheck.forEach(b => {
            // Match by key, ID substring, key substring, or any active license in Supabase
            const matchedLicense = licensesData.find((l: any) => {
              if (!l.is_active && !l.device_id) return false;
              if (b.activationKey && l.key && l.key.trim().toLowerCase() === b.activationKey.trim().toLowerCase()) return true;
              if (l.device_id && (l.device_id === b.id || b.id.includes(l.device_id))) return true;
              if (l.key && (b.id.toLowerCase().includes(l.key.toLowerCase().replace(/act-?/g, '')))) return true;
              if (l.is_active && l.device_id) return true; // Tablet activated online
              return false;
            });

            if (matchedLicense || licensesData.some((l: any) => l.is_active && l.device_id)) {
              b.status = 'online';
              b.activationStatus = 'activated';
              b.lastSyncAt = (matchedLicense && matchedLicense.activated_at) || new Date().toISOString();
              b.appVersion = 'v1.5.0';
              b.telemetry = {
                cameraStatus: 'online',
                cameraFps: 30,
                printerStatus: (b.paperPrintsRemaining || 150) < 20 ? 'low_paper' : 'ready',
                printerModel: 'ESC/POS Thermal 80mm',
                paperRemainingPercent: Math.round(((b.paperPrintsRemaining || 150) / 150) * 100),
                paperPrintsRemaining: b.paperPrintsRemaining !== undefined ? b.paperPrintsRemaining : 150,
                storageUsedGb: 0.4,
                storageTotalGb: 64,
                memoryUsedMb: 420,
                memoryTotalMb: 4096,
                cpuTempC: 38.5,
                internetLatencyMs: Math.floor(14 + Math.random() * 12),
                internetType: (navigator as any).connection?.effectiveType === '4g' ? '4g_5g' : 'wifi'
              };
              hasUpdated = true;
            }
          });

          if (hasUpdated) {
            this.saveBooths();
          }
        }
      }
    } catch (err) {
      console.warn('[PortalDB] Supabase query failed:', err);
    }

    const orgBooths = this.customBoothsByOrg[this.activeOrg.id] || [];
    const allCustom = Object.values(this.customBoothsByOrg).flat();
    const fallbackList = orgBooths.length > 0 ? orgBooths : allCustom;

    // Merge and de-duplicate by ID
    const map = new Map<string, Booth>();
    [...supabaseBooths, ...fallbackList].forEach(b => map.set(b.id, b));
    let combinedFleet = Array.from(map.values());

    // Guarantee the active organization always has at least 1 booth branch visible
    if (combinedFleet.length === 0) {
      const defaultBooth: Booth = {
        id: `booth-${this.activeOrg.slug}-1`,
        name: `${this.activeOrg.name} Booth 1`,
        assignedCafe: this.activeOrg.name,
        location: `${this.activeOrg.branches[1] || 'Main Branch'}`,
        branch: `${this.activeOrg.branches[1] || 'Main Branch'}`,
        status: 'online',
        lastSyncAt: new Date().toISOString(),
        appVersion: 'v1.5.0',
        activationStatus: 'activated',
        activationKey: `ACT-${this.activeOrg.slug.toUpperCase()}-1001`,
        businessModel: 'profit_share',
        isFreeEventMode: false,
        pricingPerSession: 99,
        profitSharePercent: 60,
        todayRevenue: 0,
        todaySessions: 0,
        todayPrints: 0,
        paperMaxPrints: 150,
        paperPrintsRemaining: 150,
        paperRefilledAt: new Date().toISOString(),
        currentTheme: 'Classic Thermal',
        activePackageCount: 4,
        telemetry: {
          cameraStatus: 'online',
          cameraFps: 30,
          printerStatus: 'ready',
          printerModel: 'ESC/POS Thermal 80mm',
          paperRemainingPercent: 100,
          paperPrintsRemaining: 150,
          storageUsedGb: 0.4,
          storageTotalGb: 64,
          memoryUsedMb: 420,
          memoryTotalMb: 4096,
          cpuTempC: 38.5,
          internetLatencyMs: 18,
          internetType: 'wifi'
        }
      };
      this.customBoothsByOrg[this.activeOrg.id] = [defaultBooth];
      this.saveBooths();
      combinedFleet = [defaultBooth];
    }

    return this.filterByBranch(combinedFleet);
  }

  private filterByBranch<T extends { branch: string }>(items: T[]): T[] {
    if (this.activeBranch === 'All Locations') return items;
    return items.filter(i => i.branch === this.activeBranch);
  }

  private deletedSessionIds: Set<string> = new Set();
  private deletedActivityIds: Set<string> = new Set();

  public deleteSession(sessionId: string): void {
    this.deletedSessionIds.add(sessionId);
    if (navigator.onLine) {
      void supabase.from('collections').delete().eq('id', sessionId).then(({ error }) => {
        if (error) console.warn('[PortalDB] Error deleting collection from Supabase:', error);
      });
    }
  }

  public deleteActivityEvent(eventId: string): void {
    this.deletedActivityIds.add(eventId);
  }

  public async getSessions(): Promise<SessionRecord[]> {
    let supabaseSessions: SessionRecord[] = [];

    try {
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('collections')
          .select('*')
          .limit(100);

        if (!error && data && data.length > 0) {
          supabaseSessions = data.map((s: any) => ({
            id: s.id || `sess-live-${Math.random().toString(36).substring(2, 6)}`,
            boothId: s.booth_id || 'booth-1',
            boothName: `${this.activeOrg.name} Booth`,
            location: 'Branch',
            createdAt: s.created_at || new Date().toISOString(),
            layoutType: s.layout_type || 'Duet Grid',
            templateId: s.template_id || 'Classic Thermal',
            printsCount: s.prints_count || 1,
            additionalPrints: 0,
            totalAmount: parseFloat(s.total_amount) || 99,
            snapShare: parseFloat(s.total_amount) * 0.6 || 59.4,
            partnerShare: parseFloat(s.total_amount) * 0.4 || 39.6,
            shareId: s.share_id || 'sh-live',
            packageName: 'Package B (Double)',
            packagePrice: 149,
            paymentMethod: 'gcash',
            completionStatus: 'completed'
          }));
        }
      }
    } catch (e) {
      console.warn('[PortalDB] Supabase collections query error:', e);
    }

    return supabaseSessions.filter(s => !this.deletedSessionIds.has(s.id));
  }

  public async getActivityEvents(): Promise<ActivityEvent[]> {
    const booths = await this.getBooths();
    if (booths.length === 0) return [];

    const mockEvents: ActivityEvent[] = [
      {
        id: 'act-1',
        boothId: booths[0]?.id || 'b1',
        boothName: booths[0]?.name || 'Primary Booth',
        timestamp: new Date(Date.now() - 120000).toISOString(),
        type: 'purchase',
        title: 'Session Package Purchased',
        detail: 'Customer paid ₱99 via GCash Scan-to-Pay',
        amount: 99,
        icon: '💳'
      },
      {
        id: 'act-2',
        boothId: booths[0]?.id || 'b1',
        boothName: booths[0]?.name || 'Primary Booth',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        type: 'print',
        title: 'Thermal Receipts Printed',
        detail: 'High definition thermal receipt printed successfully',
        icon: '🖨️'
      }
    ];

    return mockEvents.filter(e => !this.deletedActivityIds.has(e.id));
  }

  public async getAnalyticsSummary(): Promise<AnalyticsSummary> {
    const sessions = await this.getSessions();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    const revenueByDay = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const label = days[d.getDay()];
      const daySessions = sessions.filter(s => new Date(s.createdAt).getDay() === d.getDay());
      const amount = daySessions.reduce((acc, s) => acc + s.totalAmount, 0);
      return { date: d.toISOString().split('T')[0], label, amount };
    });

    const sessionsByDay = revenueByDay.map(r => ({
      date: r.date,
      label: r.label,
      count: sessions.filter(s => new Date(s.createdAt).toISOString().split('T')[0] === r.date).length
    }));

    return {
      totalRevenue7d: revenueByDay.reduce((acc, r) => acc + r.amount, 0),
      totalSessions7d: sessionsByDay.reduce((acc, s) => acc + s.count, 0),
      totalPrints7d: sessionsByDay.reduce((acc, s) => acc + (s.count * 2), 0),
      revenueByDay,
      sessionsByDay,
      printsByLayout: [
        { layout: 'classic-solo', label: 'Classic Solo (1 Photo)', count: 0, percentage: 0 },
        { layout: 'duet-grid', label: 'Duet Grid (2 Photos)', count: 0, percentage: 0 },
        { layout: 'trio-strip', label: 'Trio Strip (3 Photos)', count: 0, percentage: 0 },
        { layout: 'quad-collage', label: 'Quad Collage (4 Photos)', count: 0, percentage: 0 }
      ],
      packageSales: [
        { name: 'Package A (Single)', count: 0, revenue: 0 },
        { name: 'Package B (Double)', count: 0, revenue: 0 },
        { name: 'Package C (Triple)', count: 0, revenue: 0 },
        { name: 'Package D (Party Pack)', count: 0, revenue: 0 }
      ],
      peakHours: [],
      peakDays: [],
      paymentBreakdown: []
    };
  }

  public getPackages(): PackageConfig[] {
    return [
      {
        id: 'pkg-a',
        name: 'Package A (Single)',
        price: 99,
        photos: 3,
        prints: 1,
        allowedLayouts: ['classic-solo', 'trio-strip'],
        enabled: true,
        qrData: 'PACKAGE_A|PRINTS=1|PRICE=99'
      },
      {
        id: 'pkg-b',
        name: 'Package B (Double)',
        price: 149,
        photos: 3,
        prints: 2,
        allowedLayouts: ['classic-solo', 'duet-grid', 'trio-strip'],
        enabled: true,
        qrData: 'PACKAGE_B|PRINTS=2|PRICE=149'
      },
      {
        id: 'pkg-c',
        name: 'Package C (Triple)',
        price: 199,
        photos: 4,
        prints: 3,
        allowedLayouts: ['classic-solo', 'duet-grid', 'trio-strip', 'quad-collage'],
        enabled: true,
        qrData: 'PACKAGE_C|PRINTS=3|PRICE=199'
      },
      {
        id: 'pkg-d',
        name: 'Package D (Party Pack)',
        price: 299,
        photos: 4,
        prints: 5,
        allowedLayouts: ['classic-solo', 'duet-grid', 'trio-strip', 'quad-collage'],
        enabled: true,
        qrData: 'PACKAGE_D|PRINTS=5|PRICE=299'
      }
    ];
  }

  public getRemoteSettings(): RemoteSettings {
    return {
      pricingPerSession: 99,
      profitSharePercent: 60,
      cafeName: this.activeOrg.name,
      cafeAddress: 'Main Branch Address',
      cafePhone: this.activeOrg.contactPhone,
      socialTag: `@${this.activeOrg.slug}`,
      customMessage: 'Thank you for visiting! Smile, share memories, and spread love.',
      welcomeMsg: `Welcome to ${this.activeOrg.name}! Tap screen to start photobooth.`,
      adminPin: '1234',
      homeSubtitleTop: 'SNAPSHOT MEMORIES',
      homeSubtitleBottom: 'Thermal Receipt Photobooth',
      accentColor: '#6366f1',
      bgColor: '#090a0f',
      textColor: '#ffffff',
      enableStickers: true,
      enableEventMode: false,
      enablePaywall: true,
      cameraFilterBw: false,
      homeMode: 'graphic'
    };
  }

  public getNotifications(): NotificationItem[] {
    return [];
  }
}

export const portalDb = new PortalDatabaseService();

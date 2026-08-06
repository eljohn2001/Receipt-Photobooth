export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  contactEmail: string;
  contactPhone: string;
  plan: 'basic' | 'pro' | 'enterprise';
  branches: string[];
}

export interface HardwareTelemetry {
  cameraStatus: 'online' | 'degraded' | 'offline' | 'pending';
  cameraFps: number;
  printerStatus: 'ready' | 'low_paper' | 'paper_out' | 'disconnected' | 'pending';
  printerModel: string;
  paperRemainingPercent: number;
  paperPrintsRemaining: number;
  storageUsedGb: number;
  storageTotalGb: number;
  memoryUsedMb: number;
  memoryTotalMb: number;
  cpuTempC: number;
  internetLatencyMs: number;
  internetType: 'wifi' | 'ethernet' | '4g_5g' | 'none';
}

export interface Booth {
  id: string; // Hardware UUID
  name: string;
  assignedCafe: string;
  location: string;
  branch: string;
  status: 'online' | 'offline' | 'pending_activation' | 'maintenance';
  lastSyncAt: string;
  appVersion: string;
  activationStatus: 'activated' | 'pending' | 'revoked';
  activationKey?: string;
  businessModel: 'profit_share' | 'flat_rental';
  isFreeEventMode: boolean;
  pricingPerSession: number;
  profitSharePercent: number;
  todayRevenue: number;
  todaySessions: number;
  todayPrints: number;
  paperMaxPrints: number;
  paperPrintsRemaining: number;
  paperRefilledAt: string;
  currentTheme: string;
  activePackageCount: number;
  telemetry: HardwareTelemetry;
}

export interface SessionRecord {
  id: string;
  boothId: string;
  boothName: string;
  location: string;
  createdAt: string;
  layoutType: string;
  templateId: string;
  printsCount: number;
  additionalPrints: number;
  totalAmount: number;
  snapShare: number;
  partnerShare: number;
  shareId: string | null;
  packageName: string | null;
  packagePrice: number | null;
  paymentMethod: 'cash' | 'gcash' | 'maya' | 'qr_code' | 'free_event';
  completionStatus: 'completed' | 'cancelled';
}

export interface ActivityEvent {
  id: string;
  boothId: string;
  boothName: string;
  timestamp: string;
  type: 'purchase' | 'capture_start' | 'print' | 'template_select' | 'system_alert' | 'curtain_idle';
  title: string;
  detail: string;
  amount?: number;
  icon: string;
}

export interface PackageConfig {
  id: string;
  name: string;
  price: number;
  photos: number;
  prints: number;
  allowedLayouts: string[];
  enabled: boolean;
  qrData: string;
}

export interface RemoteSettings {
  pricingPerSession: number;
  profitSharePercent: number;
  cafeName: string;
  cafeAddress: string;
  cafePhone: string;
  socialTag: string;
  customMessage: string;
  welcomeMsg: string;
  adminPin: string;
  homeSubtitleTop: string;
  homeSubtitleBottom: string;
  accentColor: string;
  bgColor: string;
  textColor: string;
  enableStickers: boolean;
  enableEventMode: boolean;
  enablePaywall: boolean;
  cameraFilterBw: boolean;
  homeMode: 'graphic' | 'layout' | 'curtain';
}

export interface NotificationItem {
  id: string;
  boothId?: string;
  boothName?: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export interface AnalyticsSummary {
  totalRevenue7d: number;
  totalSessions7d: number;
  totalPrints7d: number;
  revenueByDay: { date: string; label: string; amount: number }[];
  sessionsByDay: { date: string; label: string; count: number }[];
  printsByLayout: { layout: string; label: string; count: number; percentage: number }[];
  packageSales: { name: string; count: number; revenue: number }[];
  peakHours: { hour: string; count: number }[];
  peakDays: { day: string; count: number }[];
  paymentBreakdown: { method: string; count: number; percentage: number }[];
}

export type PortalTab = 
  | 'dashboard'
  | 'booths'
  | 'activity'
  | 'analytics'
  | 'transactions'
  | 'settings'
  | 'qr-packages'
  | 'monitoring'
  | 'notifications'
  | 'help'
  | 'more';

import type { PrintPackage } from '../types';

export interface KioskConfig {
  cafeName: string;
  cafeAddress: string;
  cafePhone: string;
  backgroundColor: string;
  textColor: string;
  textColorHome: string;
  logoDataUrl: string | null;       // base64 SVG/PNG
  logoScreenDataUrl?: string | null; // base64 SVG/PNG for screen UI
  backgroundType: 'image' | 'video' | null;
  customMessage: string;
  imgurClientId?: string;
  imgbbApiKey?: string;
  homeScreenMode?: 'graphic' | 'layout' | 'curtain';
  curtainOverlayDataUrl?: string | null; // base64 PNG
  socialTag?: string;
  enableQrCode?: boolean;
  homeSubtitleTop?: string;
  homeSubtitleBottom?: string;
  adminPin?: string;
  enableMemoryFortune?: boolean;
  enableComfortCards?: boolean;
  printContrast?: 'light' | 'medium' | 'dark' | 'deep';
  curtainColor?: string;
  printerMode?: 'usb' | 'bluetooth';
  sessionPrice?: number;
  profitSharePercent?: number;
  packages?: PrintPackage[];
  maxPrintsAllowed?: number;
  currencySymbol?: string;
  welcomeMessage?: string;
  paperMaxPrints?: number;
  paperPrintsRemaining?: number;
  paperRefilledAt?: string;
  accentColor?: string;
  paperWidth?: '58mm' | '80mm';
  saveToGallery?: boolean;
  cameraFilter?: 'bw' | 'color';
  enableStickers?: boolean;
  enableEventMode?: boolean;
  enablePaywall?: boolean;
  paymentQrCodeDataUrl?: string | null;
  paymentAccountName?: string;
  paymentAccountNumber?: string;
  paymentInstructions?: string;
}

export const DEFAULT_CONFIG: KioskConfig = {
  cafeName: 'BEANS & BITES',
  cafeAddress: '128 ESPRESSO BLVD, CAFE LAND',
  cafePhone: '555-420-BEANS',
  backgroundColor: '#ffffff',
  textColor: '#000000',
  textColorHome: '#000000',
  logoDataUrl: null,
  logoScreenDataUrl: null,
  backgroundType: null,
  customMessage: 'Thank you for stopping by! Keep smiling.',
  imgurClientId: '',
  imgbbApiKey: '',
  homeScreenMode: 'graphic',
  curtainOverlayDataUrl: null,
  curtainColor: '#111111',
  socialTag: 'beansandbites',
  enableQrCode: true,
  homeSubtitleTop: '06.21.2026',
  homeSubtitleBottom: 'Receipt Photo Booth',
  adminPin: '1234',
  enableMemoryFortune: true,
  enableComfortCards: true,
  printContrast: 'medium',
  printerMode: 'usb',
  paperWidth: '80mm',
  saveToGallery: true,
  cameraFilter: 'color',
  enableStickers: true,
  enableEventMode: false,
  enablePaywall: false,
  paymentQrCodeDataUrl: null,
  paymentAccountName: 'BEANS & BITES',
  paymentAccountNumber: '',
  paymentInstructions: 'Scan QR code via GCash or e-wallet to pay exact amount.',
  sessionPrice: 30.00,
  profitSharePercent: 60.00,
  maxPrintsAllowed: 4,
  currencySymbol: '₱',
  welcomeMessage: 'Welcome to Snapceipt!',
  packages: [
    { id: 'pkg-a', name: 'Package A', printsCount: 1, photoCount: 3, price: 50, isEnabled: true, qrCodeDataUrl: null, qrDataCode: 'PACKAGE_A|PRINTS=1', inclusions: '1 Thermal Print + Digital Softcopy', allowedLayouts: [] },
    { id: 'pkg-b', name: 'Package B', printsCount: 2, photoCount: 3, price: 99, isEnabled: true, qrCodeDataUrl: null, qrDataCode: 'PACKAGE_B|PRINTS=2', inclusions: '2 Thermal Prints + Digital Softcopy', allowedLayouts: [] },
    { id: 'pkg-c', name: 'Package C', printsCount: 3, photoCount: 3, price: 149, isEnabled: true, qrCodeDataUrl: null, qrDataCode: 'PACKAGE_C|PRINTS=3', inclusions: '3 Thermal Prints + Digital Softcopy', allowedLayouts: [] },
    { id: 'pkg-d', name: 'Package D', printsCount: 4, photoCount: 3, price: 199, isEnabled: true, qrCodeDataUrl: null, qrDataCode: 'PACKAGE_D|PRINTS=4', inclusions: '4 Thermal Prints + Digital Softcopy', allowedLayouts: [] }
  ],
  paperMaxPrints: 150,
  paperPrintsRemaining: 150,
  paperRefilledAt: new Date(2026, 0, 1).toISOString(),
  accentColor: '#007aff'
};

const STORAGE_KEY = 'receipt_booth_kiosk_config';

export function loadKioskConfig(): KioskConfig {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Migration: If the user had the previous black background defaults saved, migrate them to the new white default theme
      if (parsed && parsed.backgroundColor === '#000000' && parsed.textColor === '#ffffff') {
        parsed.backgroundColor = '#ffffff';
        parsed.textColor = '#000000';
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
      }
      const config = { ...DEFAULT_CONFIG, ...parsed };
      if (!config.packages || !Array.isArray(config.packages) || config.packages.length === 0) {
        config.packages = DEFAULT_CONFIG.packages;
      } else {
        config.packages = DEFAULT_CONFIG.packages!.map((defPkg, idx) => {
          const existing = config.packages![idx] || config.packages!.find((p: any) => p.id === defPkg.id) || {};
          return { ...defPkg, ...existing };
        });
      }
      return config;
    } catch (e) {
      console.warn('Failed to parse saved kiosk configuration:', e);
      return DEFAULT_CONFIG;
    }
  }
  return DEFAULT_CONFIG;
}

export function saveKioskConfig(config: KioskConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save kiosk configuration to localStorage:', e);
  }
}

export function resetKioskConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export async function factoryResetKioskApp(): Promise<void> {
  try {
    localStorage.clear();
  } catch (e) {
    console.warn('[FactoryReset] Error clearing localStorage:', e);
  }

  try {
    if (typeof indexedDB !== 'undefined') {
      indexedDB.deleteDatabase('receipt_booth_db');
      indexedDB.deleteDatabase('receipt_booth_sessions');
    }
  } catch (e) {
    console.warn('[FactoryReset] Error deleting IndexedDB:', e);
  }

  window.location.reload();
}

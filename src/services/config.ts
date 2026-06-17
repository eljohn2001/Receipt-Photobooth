/**
 * Kiosk configuration storage service for branding customisation.
 * Stores values locally in browser's localStorage.
 */

export interface KioskConfig {
  cafeName: string;
  cafeAddress: string;
  cafePhone: string;
  backgroundColor: string;
  textColor: string;
  textColorHome: string;
  logoDataUrl: string | null;       // base64 SVG/PNG
  backgroundType: 'image' | 'video' | null;
  customMessage: string;
  imgurClientId?: string;
  imgbbApiKey?: string;
  homeScreenMode?: 'graphic' | 'layout';
}

export const DEFAULT_CONFIG: KioskConfig = {
  cafeName: 'BEANS & BITES',
  cafeAddress: '128 ESPRESSO BLVD, CAFE LAND',
  cafePhone: '555-420-BEANS',
  backgroundColor: '#ffffff',
  textColor: '#000000',
  textColorHome: '#000000',
  logoDataUrl: null,
  backgroundType: null,
  customMessage: 'Thank you for stopping by! Keep smiling.',
  imgurClientId: '6e08c02c63d5ad3',
  imgbbApiKey: 'c6b792880a4b31c6d365bd5586f10dc2',
  homeScreenMode: 'graphic'
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
      return { ...DEFAULT_CONFIG, ...parsed };
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

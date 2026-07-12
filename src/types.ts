export type AppState =
  | 'activation'
  | 'idle'
  | 'mode-selection'
  | 'template-selection'
  | 'package-selection'
  | 'order-summary'
  | 'camera-capture'
  | 'preview'
  | 'printing'
  | 'finished';

export interface PrintPackage {
  id: string;
  name: string;
  printsCount: number;
  price: number;
  isEnabled: boolean;
}

export interface OrderItem {
  name: string;
  price: number;
  qty?: number;
}

export interface ReceiptMetadata {
  cafeName: string;
  cafeAddress: string;
  cafePhone: string;
  timestamp: string;
  receiptNumber: string;
  customMessage?: string;
  homeSubtitleBottom?: string;
  qrCodeUrl?: string;
  items?: OrderItem[];
}

export interface ReceiptTemplate {
  id: string;
  name: string;
  description: string;
  emoji: string;
  photoCount: number; // 1 or 3 for filmstrip
  aspectRatio: number; // e.g. 1.0 for square, 0.75 for 3:4 portrait
  render: (photos: string[], metadata: ReceiptMetadata, session?: AppSession) => string;
}

export interface AppSession {
  selectedTemplateId: string | null;
  selectedThemeId?: string; // Selected theme overlay ID (e.g. 'default', 'theme-1', 'theme-2')
  capturedPhotos: string[]; // Base64 or ObjectURLs of original pictures
  ditheredPhotos: string[]; // Dithered canvas data URLs
  metadata: ReceiptMetadata | null;
  isMirrored?: boolean;
  copiesCount?: number;
  uploadPromise?: Promise<string | null>;
  bwBlob?: Blob;
  colorBlob?: Blob;
  shareId?: string;
  selectedQuote?: string;
  selectedIllustration?: string;
  selectedPackage?: PrintPackage;
}

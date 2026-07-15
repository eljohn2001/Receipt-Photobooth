import { loadKioskConfig } from '../services/config';
import type { ReceiptMetadata, AppSession } from '../types';

export function renderReceiptHeader(metadata: ReceiptMetadata): string {
  const config = loadKioskConfig();
  if (config.logoDataUrl) {
    return `
      <div class="template-header">
        <img class="template-header-logo" src="${config.logoDataUrl}" alt="${metadata.cafeName}" />
      </div>
    `;
  }
  return `
    <div class="template-header">
      <div class="template-header-name">${metadata.cafeName}</div>
    </div>
  `;
}

export function renderReceiptFooter(metadata: ReceiptMetadata): string {
  // Format the date using pipes (e.g. MM|DD|YYYY)
  const getFormattedDate = (dateStr: string) => {
    try {
      // Clean up string: replace commas, custom strings to make it parseable
      const cleaned = dateStr.split(',')[0].trim();
      const d = new Date(cleaned);
      if (!isNaN(d.getTime())) {
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${pad(d.getMonth() + 1)}|${pad(d.getDate())}|${d.getFullYear()}`;
      }
    } catch (e) {}
    
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getMonth() + 1)}|${pad(d.getDate())}|${d.getFullYear()}`;
  };

  const formattedDate = getFormattedDate(metadata.timestamp);

  return `
    <div class="template-footer">
      <div class="template-footer-location">${metadata.cafeAddress}</div>
      <div class="template-footer-date">${formattedDate}</div>
    </div>
  `;
}

export function renderReceiptDivider(): string {
  const config = loadKioskConfig();
  const dots = config.paperWidth === '58mm' ? '.............................' : '............................................';
  return `<div class="receipt-divider">${dots}</div>`;
}

export function renderReceiptQR(metadata: ReceiptMetadata): string {
  const config = loadKioskConfig();
  if (config.enableQrCode === false || !metadata.qrCodeUrl) {
    return '';
  }
  return `
    ${renderReceiptDivider()}
    <div class="receipt-qr-block">
      <div class="qr-info-text">SCAN FOR DIGITAL COPY</div>
      <img class="receipt-qr-image" src="${metadata.qrCodeUrl}" alt="QR Link" />
      <div class="qr-web-link">photoreceipt.stoodioph.com</div>
    </div>
  `;
}

export function renderReceiptFortune(session: AppSession): string {
  const config = loadKioskConfig();
  if (config.enableMemoryFortune === false || !session.selectedQuote) {
    return '';
  }
  return `
    <div class="receipt-fortune-wrapper">
      ${renderReceiptDivider()}
      <div class="receipt-fortune-block">
        <div class="fortune-title">MEMORY FORTUNE</div>
        <div class="fortune-text">"${session.selectedQuote}"</div>
      </div>
    </div>
  `;
}

export function getIllustrationSvgById(id: string): string {
  switch (id) {
    case 'candle':
      return `
        <svg viewBox="0 0 64 64" class="comfort-card-svg" xmlns="http://www.w3.org/2000/svg">
          <rect x="26" y="26" width="12" height="24" rx="2" fill="none" stroke="black" stroke-width="3"/>
          <path d="M32,26 v-6 M32,20 Q30,14 32,8 Q34,14 32,20" fill="none" stroke="black" stroke-width="3" stroke-linecap="round"/>
          <path d="M16,50 h32 M12,54 h40" stroke="black" stroke-width="3" stroke-linecap="round"/>
          <path d="M22,16 Q16,22 22,28 M42,16 Q48,22 42,28" fill="none" stroke="black" stroke-width="2" stroke-dasharray="3,3"/>
        </svg>
      `;
    case 'flower':
      return `
        <svg viewBox="0 0 64 64" class="comfort-card-svg" xmlns="http://www.w3.org/2000/svg">
          <circle cx="32" cy="24" r="5" fill="none" stroke="black" stroke-width="3"/>
          <circle cx="32" cy="14" r="4.5" fill="none" stroke="black" stroke-width="2.5"/>
          <circle cx="32" cy="34" r="4.5" fill="none" stroke="black" stroke-width="2.5"/>
          <circle cx="22" cy="24" r="4.5" fill="none" stroke="black" stroke-width="2.5"/>
          <circle cx="42" cy="24" r="4.5" fill="none" stroke="black" stroke-width="2.5"/>
          <path d="M32,29 v15" stroke="black" stroke-width="3"/>
          <path d="M32,36 Q26,34 24,38 M32,39 Q38,37 40,41" fill="none" stroke="black" stroke-width="2.5"/>
          <polygon points="22,44 42,44 38,56 26,56" fill="none" stroke="black" stroke-width="3" stroke-linejoin="round"/>
        </svg>
      `;
    case 'star':
      return `
        <svg viewBox="0 0 64 64" class="comfort-card-svg" xmlns="http://www.w3.org/2000/svg">
          <path d="M32,6 L39,20 L54,22 L43,33 L46,48 L32,41 L18,48 L21,33 L10,22 L25,20 Z" fill="none" stroke="black" stroke-width="3" stroke-linejoin="round"/>
          <circle cx="27" cy="26" r="1.5" fill="black"/>
          <circle cx="37" cy="26" r="1.5" fill="black"/>
          <path d="M29,31 Q32,34 35,31" fill="none" stroke="black" stroke-width="2" stroke-linecap="round"/>
          <path d="M12,12 l4,4 M12,16 l4,-4 M48,12 l4,4 M48,16 l4,-4" stroke="black" stroke-width="2" stroke-linecap="round"/>
        </svg>
      `;
    case 'coffee':
    default:
      return `
        <svg viewBox="0 0 64 64" class="comfort-card-svg" xmlns="http://www.w3.org/2000/svg">
          <path d="M16,24 h24 v24 C40,52 36,56 32,56 H24 C20,56 16,52 16,48 Z" fill="none" stroke="black" stroke-width="3"/>
          <path d="M40,28 h4 a6,6 0 0 1 6,6 v4 a6,6 0 0 1 -6,6 h-4" fill="none" stroke="black" stroke-width="3"/>
          <path d="M22,12 Q24,18 22,20 M28,10 Q30,16 28,18 M34,12 Q36,18 34,20" fill="none" stroke="black" stroke-width="2.5" stroke-linecap="round"/>
          <line x1="12" y1="56" x2="48" y2="56" stroke="black" stroke-width="3" stroke-linecap="round"/>
        </svg>
      `;
  }
}

export function renderComfortCard(session: AppSession, metadata: ReceiptMetadata): string {
  const illustrationSvg = getIllustrationSvgById(session.selectedIllustration || 'coffee');

  return `
    <div class="collage-receipt-container comfort-card-receipt">
      ${renderReceiptHeader(metadata)}
      
      <div class="comfort-card-illustration-wrapper">
        ${illustrationSvg}
      </div>

      ${renderReceiptDivider()}
      
      <div class="comfort-card-body">
        <div class="comfort-card-title">COMFORT CARD</div>
        <div class="comfort-card-text">"${session.selectedQuote}"</div>
      </div>

      ${renderReceiptQR(metadata)}
      ${renderReceiptFooter(metadata)}
    </div>
  `;
}

export function generateBarcodeSvg(): string {
  const pattern = [
    2,1,3,1,1,2,4,1,1,3,2,1,1,2,2,3,1,1,4,1,2,2,1,3,1,2,1,4,1,1,2,3,1,2,2,1,1,3,2,2,1,1,4,1,2,1
  ];
  let x = 10;
  let svgPaths = '';
  for (let i = 0; i < pattern.length; i++) {
    const width = pattern[i];
    if (i % 2 === 0) {
      svgPaths += `<rect x="${x}" y="5" width="${width * 2}" height="60" fill="black" />`;
    }
    x += width * 2 + 2;
  }
  return `<svg width="100%" height="70" viewBox="0 0 ${x + 10} 70" xmlns="http://www.w3.org/2000/svg">${svgPaths}</svg>`;
}

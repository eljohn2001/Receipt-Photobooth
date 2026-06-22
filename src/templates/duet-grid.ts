import type { ReceiptMetadata, ReceiptTemplate, AppSession } from '../types';
import { renderReceiptHeader, renderReceiptFooter, renderReceiptQR, renderReceiptFortune, generateBarcodeSvg } from './helper';

export const duetGridTemplate: ReceiptTemplate = {
  id: 'duet-grid',
  name: 'Duet Grid',
  description: 'Four photos arranged in a clean 2x2 grid layout, perfect for dynamic group snapshots.',
  emoji: '🔳',
  photoCount: 4,
  aspectRatio: 1.0,
  render: (photos: string[], metadata: ReceiptMetadata, session?: AppSession): string => {
    const photo1 = photos[0] || '';
    const photo2 = photos[1] || '';
    const photo3 = photos[2] || '';
    const photo4 = photos[3] || '';
    const themeId = session?.selectedThemeId || 'default';

    const renderPhoto = (src: string, index: number) => {
      return src 
        ? `<img class="photo-item" src="${src}" alt="Frame ${index}" />` 
        : `<div class="photo-item photo-placeholder">PHOTO ${index}</div>`;
    };

    const gridHtml = `
      <div class="template-photo-grid-4">
        ${renderPhoto(photo1, 1)}
        ${renderPhoto(photo2, 2)}
        ${renderPhoto(photo3, 3)}
        ${renderPhoto(photo4, 4)}
      </div>
    `;

    if (themeId === 'duet-1') {
      const barcodeSvg = generateBarcodeSvg();
      return `
        <div class="collage-receipt-container theme-vintage">
          <div class="vintage-theme-header">
            <div class="vintage-title-container">
              <span class="vintage-title-snap">SNAP</span>
              <span class="vintage-title-script">Reciept</span>
            </div>
            <div class="vintage-divider-line"></div>
          </div>
          
          <div class="vintage-photo-container-grid-4">
            ${renderPhoto(photo1, 1)}
            ${renderPhoto(photo2, 2)}
            ${renderPhoto(photo3, 3)}
            ${renderPhoto(photo4, 4)}
          </div>
          
          <div class="vintage-theme-footer">
            <div class="vintage-divider-line"></div>
            <div class="vintage-event-name">${metadata.customMessage || 'EVENT NAME'}</div>
            <div class="vintage-divider-line"></div>
            <div class="vintage-date">${metadata.timestamp.split(',')[0]}</div>
            
            <div class="theme-footer-scan-section">
              <div class="theme-qr-container">
                <img class="receipt-qr-image" src="${metadata.qrCodeUrl || ''}" alt="QR Code" />
                <div class="theme-qr-label">SCAN SOFTCOPY</div>
              </div>
              <div class="theme-barcode-container">
                ${barcodeSvg}
                <div class="theme-barcode-number">NO. ${metadata.receiptNumber}</div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    return `
      <div class="collage-receipt-container">
        ${renderReceiptHeader(metadata)}
        
        ${gridHtml}
        
        ${renderReceiptQR(metadata)}
        ${renderReceiptFooter(metadata)}
        ${session ? renderReceiptFortune(session) : ''}
      </div>
    `;
  }
};

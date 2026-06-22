import type { ReceiptMetadata, ReceiptTemplate, AppSession } from '../types';
import { renderReceiptHeader, renderReceiptFooter, renderReceiptQR, renderReceiptFortune, generateBarcodeSvg } from './helper';

export const filmStackTemplate: ReceiptTemplate = {
  id: 'film-stack',
  name: 'Cinema Film',
  description: 'Three wide landscape photos stacked vertically in a classic receipt film strip.',
  emoji: '🎞',
  photoCount: 3,
  aspectRatio: 1.5, // horizontal rectangle
  render: (photos: string[], metadata: ReceiptMetadata, session?: AppSession): string => {
    const photo1 = photos[0] || '';
    const photo2 = photos[1] || '';
    const photo3 = photos[2] || '';
    const themeId = session?.selectedThemeId || 'default';

    const renderPhoto = (src: string, index: number) => {
      return src 
        ? `<img class="photo-item" src="${src}" alt="Frame ${index}" />` 
        : `<div class="photo-item photo-placeholder">PHOTO ${index}</div>`;
    };

    const gridHtml = `
      <div class="template-photo-grid-3">
        ${renderPhoto(photo1, 1)}
        ${renderPhoto(photo2, 2)}
        ${renderPhoto(photo3, 3)}
      </div>
    `;

    if (themeId === 'film-1') {
      const barcodeSvg = generateBarcodeSvg();
      return `
        <div class="collage-receipt-container theme-vintage">
          <div class="vintage-theme-header">
            ${renderReceiptHeader(metadata)}
            <div class="vintage-divider-line"></div>
          </div>
          
          <div class="vintage-photo-container-grid-3">
            ${renderPhoto(photo1, 1)}
            ${renderPhoto(photo2, 2)}
            ${renderPhoto(photo3, 3)}
          </div>
          
          <div class="vintage-theme-footer">
            <div class="vintage-divider-line"></div>
            <div class="vintage-event-name">${metadata.homeSubtitleBottom || 'EVENT NAME'}</div>
            <div class="vintage-divider-line"></div>
            <div class="vintage-date">${metadata.timestamp.split(',')[0]}</div>
            
            <div class="theme-footer-scan-section">
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

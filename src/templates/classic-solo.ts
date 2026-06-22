import type { ReceiptMetadata, ReceiptTemplate, AppSession } from '../types';
import { renderReceiptHeader, renderReceiptFooter, renderReceiptQR, renderReceiptFortune, generateBarcodeSvg } from './helper';

export const classicSoloTemplate: ReceiptTemplate = {
  id: 'classic-solo',
  name: 'Classic Solo',
  description: 'A single high-contrast portrait layout with top branding and bottom location/date details.',
  emoji: '🖼',
  photoCount: 1,
  aspectRatio: 1.0,
  render: (photos: string[], metadata: ReceiptMetadata, session?: AppSession): string => {
    const photo = photos[0] || '';
    const themeId = session?.selectedThemeId || 'default';

    const gridHtml = `
      <div class="template-photo-grid-1">
        ${photo ? `<img class="photo-item" src="${photo}" alt="Solo Frame" />` : '<div class="photo-item photo-placeholder">PHOTO</div>'}
      </div>
    `;

    if (themeId === 'classic-1') {
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
          
          <div class="vintage-photo-container-solo">
            ${photo ? `<img class="photo-item" src="${photo}" alt="Solo Frame" />` : '<div class="photo-item photo-placeholder">PHOTO</div>'}
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

    if (themeId === 'classic-2') {
      const barcodeSvg = generateBarcodeSvg();
      return `
        <div class="collage-receipt-container theme-boarding">
          <div class="boarding-theme-header">
            <div class="boarding-header-right">
              <span class="boarding-plane-icon">✈</span> POWERED BY BLCKLABS
            </div>
          </div>
          
          <div class="boarding-photo-container-solo">
            ${photo ? `<img class="photo-item" src="${photo}" alt="Solo Frame" />` : '<div class="photo-item photo-placeholder">PHOTO</div>'}
          </div>
          
          <div class="boarding-theme-footer">
            <div class="boarding-info-grid">
              <div class="boarding-info-item">
                <div class="boarding-info-label">DATE</div>
                <div class="boarding-info-value">${metadata.timestamp.split(',')[0]}</div>
              </div>
              <div class="boarding-info-item">
                <div class="boarding-info-label">GATE</div>
                <div class="boarding-info-value">${metadata.cafeAddress.split(',')[0] || 'PASTORAL'}</div>
              </div>
              <div class="boarding-info-item">
                <div class="boarding-info-label">TIME</div>
                <div class="boarding-info-value">${metadata.timestamp.split(',')[1]?.trim().slice(0, 5) || '15:40'}</div>
              </div>
            </div>
            
            <div class="boarding-dashed-line"></div>
            
            <div class="boarding-pass-codes">
              <span class="boarding-code">DXB</span>
              <span class="boarding-plane-divider">✈</span>
              <span class="boarding-code">HKG</span>
            </div>
            
            <div class="boarding-pass-label">BOARDING PASS</div>
            
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

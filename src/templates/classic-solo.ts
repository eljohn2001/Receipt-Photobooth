import type { ReceiptMetadata, ReceiptTemplate } from '../types';
import { renderReceiptHeader, renderReceiptFooter } from './helper';

export const classicSoloTemplate: ReceiptTemplate = {
  id: 'classic-solo',
  name: 'Classic Solo',
  description: 'A single high-contrast portrait layout with top branding and bottom location/date details.',
  emoji: '🖼',
  photoCount: 1,
  aspectRatio: 1.0,
  render: (photos: string[], metadata: ReceiptMetadata): string => {
    const photo = photos[0] || '';
    
    return `
      <div class="collage-receipt-container">
        ${renderReceiptHeader(metadata)}
        
        <div class="template-photo-grid-1">
          ${photo ? `<img class="photo-item" src="${photo}" alt="Solo Frame" />` : '<div class="photo-item photo-placeholder">PHOTO</div>'}
        </div>
        
        ${renderReceiptFooter(metadata)}
      </div>
    `;
  }
};

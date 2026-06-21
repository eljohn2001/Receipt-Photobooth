import type { ReceiptMetadata, ReceiptTemplate } from '../types';
import { renderReceiptHeader, renderReceiptFooter, renderReceiptQR } from './helper';

export const filmStackTemplate: ReceiptTemplate = {
  id: 'film-stack',
  name: 'Cinema Film',
  description: 'Three wide landscape photos stacked vertically in a classic receipt film strip.',
  emoji: '🎞',
  photoCount: 3,
  aspectRatio: 1.5, // horizontal rectangle
  render: (photos: string[], metadata: ReceiptMetadata): string => {
    const photo1 = photos[0] || '';
    const photo2 = photos[1] || '';
    const photo3 = photos[2] || '';

    const renderPhoto = (src: string, index: number) => {
      return src 
        ? `<img class="photo-item" src="${src}" alt="Frame ${index}" />` 
        : `<div class="photo-item photo-placeholder">PHOTO ${index}</div>`;
    };

    return `
      <div class="collage-receipt-container">
        ${renderReceiptHeader(metadata)}
        
        <div class="template-photo-grid-3">
          ${renderPhoto(photo1, 1)}
          ${renderPhoto(photo2, 2)}
          ${renderPhoto(photo3, 3)}
        </div>
        
        ${renderReceiptQR(metadata)}
        ${renderReceiptFooter(metadata)}
      </div>
    `;
  }
};

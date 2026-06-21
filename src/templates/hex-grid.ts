import type { ReceiptMetadata, ReceiptTemplate } from '../types';
import { renderReceiptHeader, renderReceiptFooter, renderReceiptQR } from './helper';

export const hexGridTemplate: ReceiptTemplate = {
  id: 'hex-grid',
  name: 'Postcard',
  description: 'Six landscape photos arranged in a 2x3 grid pattern.',
  emoji: '🔲',
  photoCount: 6,
  aspectRatio: 1.5, // horizontal rectangles
  render: (photos: string[], metadata: ReceiptMetadata): string => {
    const photo1 = photos[0] || '';
    const photo2 = photos[1] || '';
    const photo3 = photos[2] || '';
    const photo4 = photos[3] || '';
    const photo5 = photos[4] || '';
    const photo6 = photos[5] || '';

    const renderPhoto = (src: string, index: number) => {
      return src 
        ? `<img class="photo-item" src="${src}" alt="Frame ${index}" />` 
        : `<div class="photo-item photo-placeholder">PHOTO ${index}</div>`;
    };

    return `
      <div class="collage-receipt-container">
        ${renderReceiptHeader(metadata)}
        
        <div class="template-photo-grid-6">
          ${renderPhoto(photo1, 1)}
          ${renderPhoto(photo2, 2)}
          ${renderPhoto(photo3, 3)}
          ${renderPhoto(photo4, 4)}
          ${renderPhoto(photo5, 5)}
          ${renderPhoto(photo6, 6)}
        </div>
        
        ${renderReceiptQR(metadata)}
        ${renderReceiptFooter(metadata)}
      </div>
    `;
  }
};

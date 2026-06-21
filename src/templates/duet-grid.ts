import type { ReceiptMetadata, ReceiptTemplate, AppSession } from '../types';
import { renderReceiptHeader, renderReceiptFooter, renderReceiptQR, renderReceiptFortune } from './helper';

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

    const renderPhoto = (src: string, index: number) => {
      return src 
        ? `<img class="photo-item" src="${src}" alt="Frame ${index}" />` 
        : `<div class="photo-item photo-placeholder">PHOTO ${index}</div>`;
    };

    return `
      <div class="collage-receipt-container">
        ${renderReceiptHeader(metadata)}
        
        <div class="template-photo-grid-4">
          ${renderPhoto(photo1, 1)}
          ${renderPhoto(photo2, 2)}
          ${renderPhoto(photo3, 3)}
          ${renderPhoto(photo4, 4)}
        </div>
        
        ${renderReceiptQR(metadata)}
        ${renderReceiptFooter(metadata)}
        ${session ? renderReceiptFortune(session) : ''}
      </div>
    `;
  }
};

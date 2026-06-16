import { loadKioskConfig } from '../services/config';
import type { ReceiptMetadata } from '../types';

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

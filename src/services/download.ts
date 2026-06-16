import { getTemplateById } from '../templates';
import type { AppSession } from '../types';

/**
 * Renders the receipt template HTML to a high-quality PNG image Blob offline.
 */
export async function generateReceiptBlob(session: AppSession): Promise<Blob> {
  const template = getTemplateById(session.selectedTemplateId || '');
  if (!template || !session.metadata) {
    throw new Error('Missing template or metadata to generate receipt copy');
  }

  // 1. Render template HTML (clean design ending right after the footer)
  const receiptHtml = template.render(session.ditheredPhotos, session.metadata);

  // 2. Create a temporary container to calculate the exact rendered height of the receipt
  const tempContainer = document.createElement('div');
  tempContainer.className = 'thermal-paper';
  // Position off-screen
  tempContainer.style.position = 'absolute';
  tempContainer.style.left = '-9999px';
  tempContainer.style.top = '-9999px';
  tempContainer.style.width = '350px'; // Set same width as preview container
  tempContainer.style.backgroundColor = '#ffffff';
  tempContainer.style.color = '#000000';
  tempContainer.style.fontFamily = "'Courier Prime', Courier, monospace";
  tempContainer.style.padding = '30px 20px';
  tempContainer.style.boxSizing = 'border-box';
  tempContainer.style.border = '1px solid #000';
  tempContainer.innerHTML = receiptHtml;
  document.body.appendChild(tempContainer);

  // Wait for all image elements inside the receipt to be loaded
  const imgs = Array.from(tempContainer.querySelectorAll('img'));
  await Promise.all(
    imgs.map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })
  );

  const width = tempContainer.offsetWidth || 350;
  const height = tempContainer.offsetHeight || 800;

  // Remove temporary container from DOM
  document.body.removeChild(tempContainer);

  // 3. Define a clean, self-contained stylesheet for the receipt SVG rendering
  // (We avoid parsing document.styleSheets because it contains external @import font urls which browsers block inside SVG images)
  const styles = `
    .thermal-paper {
      background-color: #ffffff !important;
      color: #000000 !important;
      font-family: 'Courier Prime', Courier, monospace;
      box-sizing: border-box;
      width: 100%;
      min-height: 100%;
      padding: 30px 20px;
      border: 1px solid #000;
      position: relative;
      margin: 0;
    }
    .collage-receipt-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
      box-sizing: border-box;
      padding: 6px 2px;
      background-color: #ffffff;
    }
    .template-header {
      width: 100%;
      text-align: center;
      margin-bottom: 12px;
      display: flex;
      justify-content: center;
    }
    .template-header-logo {
      max-width: 120px;
      max-height: 48px;
      object-fit: contain;
      display: block;
    }
    .template-header-name {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color: #000000;
      line-height: 1.2;
    }
    .template-photo-grid-1 {
      width: 100%;
      display: flex;
      justify-content: center;
      margin-bottom: 10px;
    }
    .template-photo-grid-1 .photo-item {
      width: 100%;
      aspect-ratio: 1.0;
      object-fit: cover;
      border: 1px solid #000000;
    }
    .template-photo-grid-4 {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(2, 1fr);
      gap: 6px;
      margin-bottom: 10px;
    }
    .template-photo-grid-4 .photo-item {
      width: 100%;
      aspect-ratio: 1.0;
      object-fit: cover;
      border: 1px solid #000000;
    }
    .template-photo-grid-3 {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 10px;
    }
    .template-photo-grid-3 .photo-item {
      width: 100%;
      aspect-ratio: 1.5;
      object-fit: cover;
      border: 1px solid #000000;
    }
    .template-photo-grid-6 {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 6px;
      margin-bottom: 10px;
    }
    .template-photo-grid-6 .photo-item {
      width: 100%;
      aspect-ratio: 1.5;
      object-fit: cover;
      border: 1px solid #000000;
    }
    .photo-placeholder {
      background: #f0f0f0;
      color: #888888;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
    }
    .template-footer {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      color: #333333;
      margin-top: 12px;
    }
    .template-footer-location {
      text-align: left;
      font-weight: 700;
      text-transform: uppercase;
      max-width: 60%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .template-footer-date {
      text-align: right;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    ${session.isMirrored ? '.photo-item { transform: scaleX(-1); }' : ''}
  `;

  // 4. Construct SVG containing the HTML markup and stylesheets
  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" class="thermal-paper">
          <style>
            ${styles}
          </style>
          ${receiptHtml}
        </div>
      </foreignObject>
    </svg>
  `;

  // 5. Load SVG as an image source using a Blob URL
  const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('Failed to load SVG into image object'));
    img.src = url;
  });

  // 6. Draw image onto canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    URL.revokeObjectURL(url);
    throw new Error('Could not get canvas context');
  }

  // Fill canvas with white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Draw SVG image
  ctx.drawImage(img, 0, 0);
  URL.revokeObjectURL(url);

  // 7. Convert canvas output to PNG blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error('Canvas toBlob conversion failed'));
      }
    }, 'image/png');
  });
}

/**
 * Exporter to render receipt HTML and trigger a local file download
 */
export async function downloadReceiptImage(session: AppSession): Promise<void> {
  const blob = await generateReceiptBlob(session);
  const link = document.createElement('a');
  const filename = `receipt-${session.metadata?.receiptNumber || 'print'}.png`;
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Revoke after download is triggered
  setTimeout(() => URL.revokeObjectURL(link.href), 100);
}

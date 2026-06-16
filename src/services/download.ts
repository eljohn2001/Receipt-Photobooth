import { getTemplateById } from '../templates';
import type { AppSession } from '../types';

/**
 * Renders the receipt template HTML to a high-quality PNG image offline and triggers a download.
 */
export async function downloadReceiptImage(session: AppSession): Promise<void> {
  const template = getTemplateById(session.selectedTemplateId || '');
  if (!template || !session.metadata) {
    throw new Error('Missing template or metadata to generate receipt copy');
  }

  // 1. Render template HTML
  const templateHtml = template.render(session.ditheredPhotos, session.metadata);

  // Combine receipt template HTML with divider and QR code blocks as in PreviewView
  const receiptHtml = `
    ${templateHtml}
    <div class="receipt-divider">--------------------------------</div>
    <div class="receipt-qr-block minimal-qr-block" style="text-align: center; margin: 15px 0;">
      <img class="receipt-qr-image minimal-qr-image" src="${session.metadata.qrCodeUrl}" alt="QR Link" style="width: 130px; height: 130px; display: inline-block;" />
    </div>
    <div class="receipt-footer-tear"></div>
  `;

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

  // Wait for all image elements (photos + QR code) inside the receipt to be loaded
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

  // 3. Extract CSS rules from styleSheets to inject inside the SVG
  let styles = '';
  try {
    for (let i = 0; i < document.styleSheets.length; i++) {
      const sheet = document.styleSheets[i];
      try {
        const rules = sheet.cssRules || sheet.rules;
        for (let j = 0; j < rules.length; j++) {
          styles += rules[j].cssText + '\n';
        }
      } catch (e) {
        // Safe catch for cross-origin stylesheet security restrictions (CORS)
      }
    }
  } catch (e) {
    console.warn('Could not read style sheets:', e);
  }

  // 4. Construct SVG containing the HTML markup and stylesheets
  const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" class="thermal-paper" style="background-color: #ffffff; color: #000000; font-family: 'Courier Prime', Courier, monospace; box-sizing: border-box; width: 100%; min-height: 100%; padding: 30px 20px; border: 1px solid #000; position: relative; margin: 0;">
          <style>
            ${styles}
            /* Enforce high contrast thermal layout print variables */
            body { background: #ffffff !important; }
            .thermal-paper { background-color: #ffffff !important; color: #000000 !important; }
            .receipt-photo, .filmstrip-photo, .polaroid-image, .postcard-image, .collage-image {
              display: block !important;
            }
            ${session.isMirrored ? '.photo-item { transform: scaleX(-1); }' : ''}
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

  // 7. Convert canvas output to PNG blob and trigger standard download
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        const link = document.createElement('a');
        const filename = `receipt-${session.metadata?.receiptNumber || 'print'}.png`;
        link.download = filename;
        link.href = URL.createObjectURL(blob);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Revoke after download is triggered
        setTimeout(() => URL.revokeObjectURL(link.href), 100);
        resolve();
      } else {
        reject(new Error('Canvas toBlob conversion failed'));
      }
    }, 'image/png');
  });
}

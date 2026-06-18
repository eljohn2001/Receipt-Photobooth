import type { AppSession } from '../types';
import { loadKioskConfig } from './config';

/**
 * Draws the receipt contents onto an HTML5 canvas element with high quality,
 * strictly matching the screen preview layout (only logo/header, photos, and footer).
 */
export async function renderReceiptToCanvas(
  session: AppSession, 
  canvas: HTMLCanvasElement, 
  mode: 'print' | 'bw' | 'color' = 'print'
): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas 2D context');

  const metadata = session.metadata;
  if (!metadata) throw new Error('Missing session metadata');

  const config = loadKioskConfig();

  // Standard canvas width of 384px (58mm printer standard width)
  const width = 384;
  canvas.width = width;

  const templateId = session.selectedTemplateId || '';
  
  let gridHeight = 0;
  const margin = 24; // Standard receipt margin matching CSS
  const printWidth = width - margin * 2; // 336px

  if (templateId === 'classic-solo') {
    gridHeight = printWidth; // 336px
  } else if (templateId === 'duet-grid') {
    const size = (printWidth - 8) / 2; // 164px
    gridHeight = size * 2 + 8; // 336px
  } else if (templateId === 'film-stack') {
    const pHeight = Math.round(printWidth / 1.5); // 224px
    gridHeight = (pHeight + 8) * 3 - 8; // 688px
  } else if (templateId === 'hex-grid') {
    const sizeW = (printWidth - 8) / 2; // 164px
    const sizeH = Math.round(sizeW / 1.5); // 109px
    gridHeight = (sizeH + 8) * 3 - 8; // 343px
  } else {
    gridHeight = printWidth;
  }

  // Helper to load image securely
  const loadImage = (src: string): Promise<HTMLImageElement> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = src;
    });
  };

  // Pre-load all photo images
  const photoSources = (mode === 'print') ? session.ditheredPhotos : session.capturedPhotos;
  const loadedPhotos = await Promise.all(photoSources.map(p => loadImage(p)));

  // Load and check Logo image size
  let logoImg: HTMLImageElement | null = null;
  let logoH = 0;
  if (config.logoDataUrl) {
    try {
      logoImg = await loadImage(config.logoDataUrl);
      const logoMaxW = 220;
      const logoMaxH = 80;
      const ratio = Math.min(logoMaxW / logoImg.width, logoMaxH / logoImg.height);
      logoH = logoImg.height * ratio;
    } catch (e) {
      console.warn('Failed to load logo for height calculation:', e);
    }
  }

  // Dynamic layout calculations to avoid trailing blank paper
  const headerHeight = logoImg ? logoH : 26;
  const spacingAfterHeader = 20;
  const spacingAfterGrid = 20;
  const footerHeight = 16;
  const padding = 25; // padding top and bottom

  const height = padding * 2 + headerHeight + spacingAfterHeader + gridHeight + spacingAfterGrid + footerHeight;
  canvas.height = height;

  // Fill canvas with solid white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;

  let y = padding;

  // 1. Draw Cafe Logo or Cafe Name at Header
  if (logoImg) {
    const logoW = logoImg.width * (logoH / logoImg.height);
    ctx.drawImage(logoImg, (width - logoW) / 2, y, logoW, logoH);
    y += logoH;
  } else {
    ctx.font = 'bold 22px "Playfair Display", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText(metadata.cafeName.toUpperCase(), width / 2, y + 18);
    y += 26;
  }

  y += spacingAfterHeader;

  // 2. Draw Photos with clean black borders
  if (mode === 'bw') {
    ctx.filter = 'grayscale(100%)';
  } else {
    ctx.filter = 'none';
  }

  if (templateId === 'classic-solo' && loadedPhotos[0]) {
    ctx.drawImage(loadedPhotos[0], margin, y, printWidth, printWidth);
    ctx.strokeRect(margin, y, printWidth, printWidth);
    y += printWidth;
  } else if (templateId === 'duet-grid') {
    const size = (printWidth - 8) / 2;
    for (let i = 0; i < 4; i++) {
      const img = loadedPhotos[i];
      if (img) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const px = margin + col * (size + 8);
        const py = y + row * (size + 8);
        ctx.drawImage(img, px, py, size, size);
        ctx.strokeRect(px, py, size, size);
      }
    }
    y += size * 2 + 8;
  } else if (templateId === 'film-stack') {
    const pHeight = Math.round(printWidth / 1.5);
    for (let i = 0; i < 3; i++) {
      const img = loadedPhotos[i];
      if (img) {
        const py = y + i * (pHeight + 8);
        ctx.drawImage(img, margin, py, printWidth, pHeight);
        ctx.strokeRect(margin, py, printWidth, pHeight);
      }
    }
    y += (pHeight + 8) * 3 - 8;
  } else if (templateId === 'hex-grid') {
    const sizeW = (printWidth - 8) / 2;
    const sizeH = Math.round(sizeW / 1.5);
    for (let i = 0; i < 6; i++) {
      const img = loadedPhotos[i];
      if (img) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const px = margin + col * (sizeW + 8);
        const py = y + row * (sizeH + 8);
        ctx.drawImage(img, px, py, sizeW, sizeH);
        ctx.strokeRect(px, py, sizeW, sizeH);
      }
    }
    y += (sizeH + 8) * 3 - 8;
  }

  ctx.filter = 'none';
  y += spacingAfterGrid;

  // 3. Draw Footer: Location (Left) and Piped Date (Right)
  const getFormattedDate = (dateStr: string) => {
    try {
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

  ctx.font = 'bold 11px "Courier Prime", "Courier New", Courier, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(metadata.cafeAddress.toUpperCase(), margin, y + 10);
  ctx.textAlign = 'right';
  ctx.fillText(formattedDate, width - margin, y + 10);
}

/**
 * Applies Floyd-Steinberg error diffusion dithering to a canvas in-place,
 * converting it to a sharp black & white dot pattern suitable for thermal print.
 */
export function ditherCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const width = canvas.width;
  const height = canvas.height;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const grayBuffer = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const a = data[idx + 3];
    if (a < 50) {
      grayBuffer[i] = 255;
    } else {
      grayBuffer[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const oldVal = grayBuffer[idx];
      const newVal = oldVal < 128 ? 0 : 255;
      grayBuffer[idx] = newVal;

      const error = oldVal - newVal;

      if (x + 1 < width) {
        grayBuffer[idx + 1] += error * (7 / 16);
      }
      if (y + 1 < height) {
        if (x - 1 >= 0) {
          grayBuffer[idx - 1 + width] += error * (3 / 16);
        }
        grayBuffer[idx + width] += error * (5 / 16);
        if (x + 1 < width) {
          grayBuffer[idx + 1 + width] += error * (1 / 16);
        }
      }
    }
  }

  for (let i = 0; i < width * height; i++) {
    const idx = i * 4;
    const val = grayBuffer[i];
    data[idx] = val;
    data[idx + 1] = val;
    data[idx + 2] = val;
    data[idx + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);
}

/**
 * Renders the receipt template HTML to a high-quality PNG image Blob offline.
 */
export async function generateReceiptBlob(
  session: AppSession, 
  mode: 'print' | 'bw' | 'color' = 'print'
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  await renderReceiptToCanvas(session, canvas, mode);
  
  if (mode === 'print') {
    ditherCanvas(canvas);
  }
  
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
 * Renders the receipt template HTML to raw ESC/POS bit-image binary commands.
 */
export async function generateReceiptEscPos(session: AppSession): Promise<Uint8Array> {
  const canvas = document.createElement('canvas');
  await renderReceiptToCanvas(session, canvas);
  ditherCanvas(canvas);
  
  const width = canvas.width;
  const height = canvas.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');
  
  const widthBytes = Math.ceil(width / 8);
  const paddedWidth = widthBytes * 8;
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  // Prepend ESC @ to initialize printer before sending GS v 0 raster command
  const header = new Uint8Array([
    0x1B, 0x40, // ESC @ (Initialize printer)
    0x1D, 0x76, 0x30, 0x00, // GS v 0 0
    widthBytes & 0xFF, (widthBytes >> 8) & 0xFF, // xL xH
    height & 0xFF, (height >> 8) & 0xFF // yL yH
  ]);

  const body = new Uint8Array(widthBytes * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < paddedWidth; x++) {
      let bit = 0; // 0 = white (blank)
      if (x < width) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        if (r < 128) {
          bit = 1; // 1 = black (print)
        }
      }

      const byteIdx = y * widthBytes + Math.floor(x / 8);
      const bitIdx = 7 - (x % 8);
      if (bit === 1) {
        body[byteIdx] |= (1 << bitIdx);
      }
    }
  }

  // Paper cut command & printer initialization
  const footer = new Uint8Array([
    0x0A, 0x0A, 0x0A, 0x0A, // 4 lines feed
    0x1D, 0x56, 0x42, 0x00, // GS V 66 0 (cut)
    0x1B, 0x40 // ESC @ (initialize)
  ]);

  const result = new Uint8Array(header.length + body.length + footer.length);
  result.set(header, 0);
  result.set(body, header.length);
  result.set(footer, header.length + body.length);

  return result;
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

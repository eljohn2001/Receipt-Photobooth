import type { AppSession } from '../types';
import { loadKioskConfig } from './config';
import { getIllustrationSvgById } from '../templates/helper';

/**
 * Helper to wrap text into multiple lines for canvas drawing.
 */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    const testLine = currentLine ? currentLine + ' ' + word : word;
    const metrics = ctx.measureText(testLine);
    const testWidth = metrics.width;
    if (testWidth > maxWidth && i > 0) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
}

function drawBarcode(
  ctx: CanvasRenderingContext2D,
  xStart: number,
  yStart: number,
  totalWidth: number,
  height: number
) {
  const pattern = [
    2,1,3,1,1,2,4,1,1,3,2,1,1,2,2,3,1,1,4,1,2,2,1,3,1,2,1,4,1,1,2,3,1,2,2,1,1,3,2,2,1,1,4,1,2,1
  ];
  let totalUnits = 0;
  for (let i = 0; i < pattern.length; i++) {
    totalUnits += pattern[i] * 2 + 2;
  }
  
  const scale = totalWidth / totalUnits;
  let x = xStart;
  ctx.save();
  ctx.fillStyle = '#000000';
  for (let i = 0; i < pattern.length; i++) {
    const width = pattern[i] * 2 * scale;
    const gap = 2 * scale;
    if (i % 2 === 0) {
      ctx.fillRect(x, yStart, width, height);
    }
    x += width + gap;
  }
  ctx.restore();
}

/**
 * Draws the receipt contents onto an HTML5 canvas element with high quality,
 * strictly matching the screen preview layout (only logo/header, photos, and footer).
 */
export async function renderReceiptToCanvas(
  session: AppSession, 
  canvas: HTMLCanvasElement, 
  mode: 'print' | 'bw' | 'color' = 'print',
  includeQrCode = false
): Promise<void> {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas 2D context');

  const metadata = session.metadata;
  if (!metadata) throw new Error('Missing session metadata');

  const config = loadKioskConfig();
  const themeImg = null;

  // Standard canvas width of 384px (58mm printer standard width)
  const width = 384;
  canvas.width = width;

  const templateId = session.selectedTemplateId || '';
  
  let gridHeight = 0;
  const margin = 24; // Standard receipt margin matching CSS
  const printWidth = width - margin * 2; // 336px

  let comfortHeight = 0;
  let comfortLines: string[] = [];

  if (templateId === 'comfort-card') {
    gridHeight = 0;
    ctx.save();
    ctx.font = 'bold 15px "Courier Prime", "Courier New", Courier, monospace';
    const quoteText = `"${session.selectedQuote || ''}"`;
    comfortLines = wrapText(ctx, quoteText, printWidth - 16);
    ctx.restore();
    comfortHeight = 90 + 16 + 18 + 20 + (comfortLines.length * 19) + 10;
  } else if (templateId === 'classic-solo') {
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

  let fortuneHeight = 0;
  let fortuneLines: string[] = [];
  const hasFortune = config.enableMemoryFortune !== false && !!session.selectedQuote && templateId !== 'comfort-card';

  if (hasFortune) {
    ctx.save();
    ctx.font = 'bold 14px "Courier Prime", "Courier New", Courier, monospace';
    const quoteText = `"${session.selectedQuote}"`;
    fortuneLines = wrapText(ctx, quoteText, printWidth - 16);
    ctx.restore();

    fortuneHeight = 18 + 20 + (fortuneLines.length * 18) + 10;
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

  // Load QR code image if enabled and explicitly requested
  let qrImg: HTMLImageElement | null = null;
  const qrSize = 110; // matches receipt-qr-image CSS width
  if (includeQrCode && config.enableQrCode !== false && metadata.qrCodeUrl) {
    try {
      qrImg = await loadImage(metadata.qrCodeUrl);
    } catch (e) {
      console.warn('Failed to load QR code image for canvas:', e);
    }
  }

  // Dynamic layout calculations to avoid trailing blank paper
  const headerHeight = logoImg ? logoH : 26;
  const spacingAfterHeader = 20;
  const spacingAfterGrid = templateId === 'comfort-card' ? 0 : 20;
  const qrHeight = qrImg ? (qrSize + 50) : 0; // QR image size + divider spacing + text spacing
  const footerHeight = 16;
  const padding = 25; // padding top and bottom

  const height = padding * 2 + headerHeight + spacingAfterHeader + gridHeight + spacingAfterGrid + qrHeight + footerHeight + fortuneHeight + comfortHeight;

  const themeId = session.selectedThemeId || 'default';
  let totalHeight = height;
  if (themeId === 'classic-1' || themeId === 'duet-1') {
    totalHeight = 681;
  } else if (themeId === 'classic-2') {
    totalHeight = 701;
  } else if (themeId === 'film-1') {
    totalHeight = 1048;
  }
  
  canvas.height = totalHeight;

  // Fill canvas with solid white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, totalHeight);

  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5;

  const isMirrored = session.isMirrored || false;

  const drawPhotoWithMirror = (img: HTMLImageElement, px: number, py: number, w: number, h: number) => {
    ctx.save();
    if (isMirrored) {
      ctx.translate(px + w / 2, py + h / 2);
      ctx.scale(-1, 1);
      ctx.drawImage(img, -w / 2, -h / 2, w, h);
    } else {
      ctx.drawImage(img, px, py, w, h);
    }
    ctx.restore();
    ctx.strokeRect(px, py, w, h);
  };

  if (themeId !== 'default') {
    let y = padding;
    if (mode === 'bw') {
      ctx.filter = 'grayscale(100%)';
    } else {
      ctx.filter = 'none';
    }

    if (themeId === 'classic-1' || themeId === 'duet-1') {
      // Draw SNAP Reciept Header
      ctx.save();
      ctx.textAlign = 'left';
      ctx.font = '900 24px "Space Grotesk", sans-serif';
      const snapW = ctx.measureText('SNAP').width;
      
      ctx.font = 'italic 36px "Italianno", "Pinyon Script", cursive';
      const recieptW = ctx.measureText('Reciept').width;
      
      const totalW = snapW + 8 + recieptW;
      const startX = (width - totalW) / 2;
      
      ctx.font = '900 24px "Space Grotesk", sans-serif';
      ctx.fillText('SNAP', startX, y + 24);
      
      ctx.font = 'italic 36px "Italianno", "Pinyon Script", cursive';
      ctx.fillText('Reciept', startX + snapW + 8, y + 28);
      ctx.restore();
      y += 34;

      ctx.fillRect(margin, y, printWidth, 2);
      y += 12;

      // Draw Photos
      if (themeId === 'classic-1' && loadedPhotos[0]) {
        drawPhotoWithMirror(loadedPhotos[0], margin, y, printWidth, printWidth);
      } else if (themeId === 'duet-1') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(margin, y, printWidth, printWidth);
        const size = (printWidth - 6) / 2;
        for (let i = 0; i < 4; i++) {
          const img = loadedPhotos[i];
          if (img) {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const px = margin + col * (size + 6);
            const py = y + row * (size + 6);
            ctx.save();
            if (isMirrored) {
              ctx.translate(px + size / 2, py + size / 2);
              ctx.scale(-1, 1);
              ctx.drawImage(img, -size / 2, -size / 2, size, size);
            } else {
              ctx.drawImage(img, px, py, size, size);
            }
            ctx.restore();
          }
        }
      }
      y += printWidth + 20;

      // Draw Footer
      ctx.fillStyle = '#000000';
      ctx.fillRect(margin, y, printWidth, 2);
      y += 6;

      ctx.save();
      ctx.font = '900 32px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((metadata.customMessage || 'EVENT NAME').toUpperCase(), width / 2, y + 28);
      ctx.restore();
      y += 36;

      ctx.fillRect(margin, y, printWidth, 2);
      y += 12;

      ctx.save();
      ctx.font = 'bold 13px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(metadata.timestamp.split(',')[0], width / 2, y + 10);
      ctx.restore();
      y += 18;

      // Draw Scan Section (QR + Barcode)
      ctx.save();
      ctx.font = 'bold 12px "Courier Prime", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('- - - - - - - - - - - - - - - - - - - -', width / 2, y + 10);
      ctx.restore();
      y += 18;

      if (qrImg) {
        ctx.drawImage(qrImg, margin + 4, y, 80, 80);
        ctx.strokeRect(margin + 4, y, 80, 80);
      }
      ctx.save();
      ctx.font = '900 7px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SCAN SOFTCOPY', margin + 44, y + 90);
      ctx.restore();

      const barcodeX = margin + 110;
      const barcodeW = printWidth - 114;
      drawBarcode(ctx, barcodeX, y + 10, barcodeW, 45);

      ctx.save();
      ctx.font = 'bold 9px "Courier Prime", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`NO. ${metadata.receiptNumber}`, barcodeX + barcodeW / 2, y + 68);
      ctx.restore();
      
    } else if (themeId === 'classic-2') {
      // Draw Header
      ctx.save();
      ctx.font = 'bold 10px "Space Grotesk", sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('✈ POWERED BY BLCKLABS', width - margin, y + 10);
      ctx.restore();
      y += 16;

      // Draw Photo
      if (loadedPhotos[0]) {
        drawPhotoWithMirror(loadedPhotos[0], margin, y, printWidth, printWidth);
      }
      y += printWidth + 20;

      // Draw Info Grid
      ctx.save();
      ctx.font = 'bold 8px "Space Grotesk", sans-serif';
      ctx.fillStyle = '#666666';
      ctx.textAlign = 'left';
      ctx.fillText('DATE', margin, y + 8);
      ctx.fillText('GATE', margin + 115, y + 8);
      ctx.fillText('TIME', margin + 250, y + 8);
      
      ctx.font = '900 11px "Space Grotesk", sans-serif';
      ctx.fillStyle = '#000000';
      ctx.fillText(metadata.timestamp.split(',')[0], margin, y + 22);
      ctx.fillText(metadata.cafeAddress.split(',')[0] || 'PASTORAL', margin + 115, y + 22);
      ctx.fillText(metadata.timestamp.split(',')[1]?.trim().slice(0, 5) || '15:40', margin + 250, y + 22);
      ctx.restore();
      y += 30;

      // Dashed separator line
      ctx.save();
      ctx.font = 'bold 12px "Courier Prime", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('- - - - - - - - - - - - - - - - - - - -', width / 2, y + 10);
      ctx.restore();
      y += 16;

      // Flight Codes
      ctx.save();
      ctx.font = '900 36px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('DXB  ✈  HKG', width / 2, y + 32);
      
      ctx.font = 'bold 10px "Space Grotesk", sans-serif';
      ctx.fillText('B O A R D I N G   P A S S', width / 2, y + 48);
      ctx.restore();
      y += 56;

      // Draw Scan Section (QR + Barcode)
      if (qrImg) {
        ctx.drawImage(qrImg, margin + 4, y, 80, 80);
        ctx.strokeRect(margin + 4, y, 80, 80);
      }
      ctx.save();
      ctx.font = '900 7px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SCAN SOFTCOPY', margin + 44, y + 90);
      ctx.restore();

      const barcodeX = margin + 110;
      const barcodeW = printWidth - 114;
      drawBarcode(ctx, barcodeX, y + 10, barcodeW, 45);

      ctx.save();
      ctx.font = 'bold 9px "Courier Prime", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`NO. ${metadata.receiptNumber}`, barcodeX + barcodeW / 2, y + 68);
      ctx.restore();
      
    } else if (themeId === 'film-1') {
      // Draw SNAP Reciept Header
      ctx.save();
      ctx.textAlign = 'left';
      ctx.font = '900 24px "Space Grotesk", sans-serif';
      const snapW = ctx.measureText('SNAP').width;
      
      ctx.font = 'italic 36px "Italianno", "Pinyon Script", cursive';
      const recieptW = ctx.measureText('Reciept').width;
      
      const totalW = snapW + 8 + recieptW;
      const startX = (width - totalW) / 2;
      
      ctx.font = '900 24px "Space Grotesk", sans-serif';
      ctx.fillText('SNAP', startX, y + 24);
      
      ctx.font = 'italic 36px "Italianno", "Pinyon Script", cursive';
      ctx.fillText('Reciept', startX + snapW + 8, y + 28);
      ctx.restore();
      y += 34;

      ctx.fillRect(margin, y, printWidth, 2);
      y += 12;

      // Draw stacked 3 landscape photos
      ctx.fillStyle = '#000000';
      const pHeight = Math.round(printWidth / 1.5); // 224px
      const stackHeight = (pHeight + 6) * 3 - 6; // 684px
      ctx.fillRect(margin, y, printWidth, stackHeight);
      for (let i = 0; i < 3; i++) {
        const img = loadedPhotos[i];
        if (img) {
          const py = y + i * (pHeight + 6);
          ctx.save();
          if (isMirrored) {
            ctx.translate(margin + printWidth / 2, py + pHeight / 2);
            ctx.scale(-1, 1);
            ctx.drawImage(img, -printWidth / 2, -pHeight / 2, printWidth, pHeight);
          } else {
            ctx.drawImage(img, margin, py, printWidth, pHeight);
          }
          ctx.restore();
        }
      }
      y += stackHeight + 20;

      // Draw Footer
      ctx.fillStyle = '#000000';
      ctx.fillRect(margin, y, printWidth, 2);
      y += 6;

      ctx.save();
      ctx.font = '900 32px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText((metadata.customMessage || 'EVENT NAME').toUpperCase(), width / 2, y + 28);
      ctx.restore();
      y += 36;

      ctx.fillRect(margin, y, printWidth, 2);
      y += 12;

      ctx.save();
      ctx.font = 'bold 13px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(metadata.timestamp.split(',')[0], width / 2, y + 10);
      ctx.restore();
      y += 18;

      // Draw Scan Section (QR + Barcode)
      ctx.save();
      ctx.font = 'bold 12px "Courier Prime", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('- - - - - - - - - - - - - - - - - - - -', width / 2, y + 10);
      ctx.restore();
      y += 18;

      if (qrImg) {
        ctx.drawImage(qrImg, margin + 4, y, 80, 80);
        ctx.strokeRect(margin + 4, y, 80, 80);
      }
      ctx.save();
      ctx.font = '900 7px "Space Grotesk", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('SCAN SOFTCOPY', margin + 44, y + 90);
      ctx.restore();

      const barcodeX = margin + 110;
      const barcodeW = printWidth - 114;
      drawBarcode(ctx, barcodeX, y + 10, barcodeW, 45);

      ctx.save();
      ctx.font = 'bold 9px "Courier Prime", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`NO. ${metadata.receiptNumber}`, barcodeX + barcodeW / 2, y + 68);
      ctx.restore();
    }

    ctx.filter = 'none';
    return;
  }

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

  // 2. Draw Photos with clean black borders and optional mirroring support
  if (mode === 'bw') {
    ctx.filter = 'grayscale(100%)';
  } else {
    ctx.filter = 'none';
  }

  if (templateId === 'comfort-card') {
    const svgString = getIllustrationSvgById(session.selectedIllustration || 'coffee');
    const svgDataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(svgString);
    try {
      const svgImg = await loadImage(svgDataUrl);
      const size = 90;
      ctx.drawImage(svgImg, (width - size) / 2, y, size, size);
      y += size + 16;
    } catch (e) {
      console.warn('Failed to load comfort card SVG:', e);
      y += 90 + 16;
    }

    ctx.font = 'bold 12px "Courier Prime", "Courier New", Courier, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('.............................', width / 2, y + 10);
    y += 18;

    ctx.font = 'bold 15px "Courier Prime", "Courier New", Courier, monospace';
    ctx.fillText('COMFORT CARD', width / 2, y + 10);
    y += 20;

    ctx.font = 'bold 15px "Courier Prime", "Courier New", Courier, monospace';
    for (const line of comfortLines) {
      ctx.fillText(line, width / 2, y + 10);
      y += 19;
    }
    y += 10;
  } else if (templateId === 'classic-solo' && loadedPhotos[0]) {
    drawPhotoWithMirror(loadedPhotos[0], margin, y, printWidth, printWidth);
    if (themeImg) {
      ctx.drawImage(themeImg, margin, y, printWidth, printWidth);
    }
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
        drawPhotoWithMirror(img, px, py, size, size);
      }
    }
    if (themeImg) {
      ctx.drawImage(themeImg, margin, y, printWidth, printWidth);
    }
    y += size * 2 + 8;
  } else if (templateId === 'film-stack') {
    const pHeight = Math.round(printWidth / 1.5);
    const stackHeight = (pHeight + 8) * 3 - 8;
    for (let i = 0; i < 3; i++) {
      const img = loadedPhotos[i];
      if (img) {
        const py = y + i * (pHeight + 8);
        drawPhotoWithMirror(img, margin, py, printWidth, pHeight);
      }
    }
    if (themeImg) {
      ctx.drawImage(themeImg, margin, y, printWidth, stackHeight);
    }
    y += stackHeight;
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
        drawPhotoWithMirror(img, px, py, sizeW, sizeH);
      }
    }
    y += (sizeH + 8) * 3 - 8;
  }

  ctx.filter = 'none';
  y += spacingAfterGrid;

  // 3. Draw QR Code if available
  if (qrImg) {
    // Draw divider dots
    ctx.font = 'bold 12px "Courier Prime", "Courier New", Courier, monospace';
    ctx.textAlign = 'center';
    ctx.fillText('.............................', width / 2, y + 10);
    y += 18;

    // Draw "SCAN FOR DIGITAL COPY" text
    ctx.font = 'bold 10px "Space Grotesk", Arial, sans-serif';
    ctx.fillText('SCAN FOR DIGITAL COPY', width / 2, y + 10);
    y += 16;

    // Draw QR image centered
    ctx.drawImage(qrImg, (width - qrSize) / 2, y, qrSize, qrSize);
    y += qrSize;

    // Draw link text
    ctx.font = '9px "Space Grotesk", Arial, sans-serif';
    ctx.fillText('photoreceipt.stoodioph.com', width / 2, y + 10);
    y += 16;
  }

  // 4. Draw Footer: Location (Left) and Piped Date (Right)
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

  ctx.font = 'bold 13px "Courier Prime", "Courier New", Courier, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(metadata.cafeAddress.toUpperCase(), margin, y + 10);
  ctx.textAlign = 'right';
  ctx.fillText(formattedDate, width - margin, y + 10);

  y += footerHeight;

  if (hasFortune) {
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';

    // 1. Divider dots
    ctx.font = 'bold 12px "Courier Prime", "Courier New", Courier, monospace';
    ctx.fillText('.............................', width / 2, y + 10);
    y += 18;

    // 2. Title "MEMORY FORTUNE"
    ctx.font = 'bold 14px "Courier Prime", "Courier New", Courier, monospace';
    ctx.fillText('MEMORY FORTUNE', width / 2, y + 10);
    y += 20;

    // 3. Quote text lines
    ctx.font = 'bold 14px "Courier Prime", "Courier New", Courier, monospace';
    for (const line of fortuneLines) {
      ctx.fillText(line, width / 2, y + 10);
      y += 18;
    }
  }
}

/**
 * Applies Floyd-Steinberg error diffusion dithering to a canvas in-place,
 * converting it to a sharp black & white dot pattern suitable for thermal print.
 */
export function ditherCanvas(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const config = loadKioskConfig();
  const contrast = config.printContrast || 'medium';
  let threshold = 128;
  if (contrast === 'light') {
    threshold = 95;
  } else if (contrast === 'dark') {
    threshold = 150;
  } else if (contrast === 'deep') {
    threshold = 175;
  }

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
      const newVal = oldVal < threshold ? 0 : 255;
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

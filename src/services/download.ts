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

  // Dynamic canvas scaling based on printer paper width (58mm = 384px, 80mm = 576px)
  const scale = config.paperWidth === '58mm' ? 1.0 : 1.5;
  const width = Math.round(384 * scale);
  canvas.width = width;

  const templateId = session.selectedTemplateId || '';
  
  let gridHeight = 0;
  const margin = Math.round(8 * scale); // Standard receipt margin matching CSS
  const printWidth = width - margin * 2;

  // Get dynamic divider styles
  const dottedLine = config.paperWidth === '58mm' ? '.............................' : '............................................';
  const dashedLine = config.paperWidth === '58mm' ? '- - - - - - - - - - - - - - - - - - - -' : '- - - - - - - - - - - - - - - - - - - - - - - - - - - - - -';

  let comfortHeight = 0;
  let comfortLines: string[] = [];

  if (templateId === 'comfort-card') {
    gridHeight = 0;
    ctx.save();
    ctx.font = `bold ${Math.round(18 * scale)}px "Courier Prime", "Courier New", Courier, monospace`;
    const quoteText = `"${session.selectedQuote || ''}"`;
    comfortLines = wrapText(ctx, quoteText, printWidth - Math.round(16 * scale));
    ctx.restore();
    comfortHeight = Math.round(90 * scale) + Math.round(16 * scale) + Math.round(22 * scale) + Math.round(25 * scale) + (comfortLines.length * Math.round(22 * scale)) + Math.round(10 * scale);
  } else if (templateId === 'classic-solo') {
    gridHeight = printWidth;
  } else if (templateId === 'duet-grid') {
    const size = (printWidth - Math.round(8 * scale)) / 2;
    gridHeight = size * 2 + Math.round(8 * scale);
  } else if (templateId === 'film-stack') {
    const pHeight = Math.round(printWidth / 1.5);
    gridHeight = (pHeight + Math.round(8 * scale)) * 3 - Math.round(8 * scale);
  } else if (templateId === 'hex-grid') {
    const sizeW = (printWidth - Math.round(8 * scale)) / 2;
    const sizeH = Math.round(sizeW / 1.5);
    gridHeight = (sizeH + Math.round(8 * scale)) * 3 - Math.round(8 * scale);
  } else {
    gridHeight = printWidth;
  }

  let fortuneHeight = 0;
  let fortuneLines: string[] = [];
  const hasFortune = config.enableMemoryFortune !== false && !!session.selectedQuote && templateId !== 'comfort-card';

  if (hasFortune) {
    ctx.save();
    ctx.font = `bold ${Math.round(16 * scale)}px "Courier Prime", "Courier New", Courier, monospace`;
    const quoteText = `"${session.selectedQuote}"`;
    fortuneLines = wrapText(ctx, quoteText, printWidth - Math.round(16 * scale));
    ctx.restore();

    fortuneHeight = Math.round(22 * scale) + Math.round(22 * scale) + (fortuneLines.length * Math.round(20 * scale)) + Math.round(10 * scale);
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
      const logoMaxW = config.paperWidth === '58mm' ? 220 : 330;
      const logoMaxH = config.paperWidth === '58mm' ? 80 : 120;
      const ratio = Math.min(logoMaxW / logoImg.width, logoMaxH / logoImg.height);
      logoH = logoImg.height * ratio;
    } catch (e) {
      console.warn('Failed to load logo for height calculation:', e);
    }
  }

  // Load QR code image if enabled and explicitly requested
  let qrImg: HTMLImageElement | null = null;
  const qrSize = config.paperWidth === '58mm' ? 110 : 160;
  if (includeQrCode && config.enableQrCode !== false && metadata.qrCodeUrl) {
    try {
      qrImg = await loadImage(metadata.qrCodeUrl);
    } catch (e) {
      console.warn('Failed to load QR code image for canvas:', e);
    }
  }

  // Dynamic layout calculations to avoid trailing blank paper
  const headerHeight = logoImg ? logoH : Math.round(30 * scale);
  const spacingAfterHeader = Math.round(20 * scale);
  const spacingAfterGrid = templateId === 'comfort-card' ? 0 : Math.round(20 * scale);
  const qrHeight = qrImg ? (qrSize + Math.round(56 * scale)) : 0;
  const footerHeight = Math.round(20 * scale);
  const isPrint = (mode === 'print');
  const paddingTop = isPrint ? 0 : Math.round(25 * scale);
  const paddingBottom = Math.round(25 * scale);
  const bottomMargin = isPrint ? Math.round(45 * scale) : 0; // Extra margin at bottom to prevent cutter from clipping footer info

  const height = paddingTop + paddingBottom + headerHeight + spacingAfterHeader + gridHeight + spacingAfterGrid + qrHeight + footerHeight + fortuneHeight + comfortHeight + bottomMargin;

  const themeId = session.selectedThemeId || 'default';
  let totalHeight = height;
  if (themeId === 'classic-1' || themeId === 'duet-1') {
    totalHeight = Math.round(680 * scale) - (isPrint ? Math.round(25 * scale) : 0) + bottomMargin;
  } else if (themeId === 'classic-2') {
    totalHeight = Math.round(795 * scale) - (isPrint ? Math.round(25 * scale) : 0) + bottomMargin;
  } else if (themeId === 'film-1') {
    totalHeight = Math.round(1050 * scale) - (isPrint ? Math.round(25 * scale) : 0) + bottomMargin;
  }
  
  canvas.height = totalHeight;

  // Fill canvas with solid white
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, totalHeight);

  ctx.fillStyle = '#000000';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5 * scale;

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
    let y = paddingTop;
    if (mode === 'bw') {
      ctx.filter = 'grayscale(100%)';
    } else {
      ctx.filter = 'none';
    }

    if (themeId === 'classic-1' || themeId === 'duet-1') {
      // Draw standard logo header
      if (logoImg) {
        const logoW = logoImg.width * (logoH / logoImg.height);
        ctx.drawImage(logoImg, (width - logoW) / 2, y, logoW, logoH);
        y += logoH;
      } else {
        ctx.save();
        ctx.font = `bold ${Math.round(25 * scale)}px "Playfair Display", Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.fillText(metadata.cafeName.toUpperCase(), width / 2, y + Math.round(20 * scale));
        ctx.restore();
        y += Math.round(30 * scale);
      }
      y += Math.round(10 * scale);

      ctx.fillRect(margin, y, printWidth, Math.round(2 * scale));
      y += Math.round(12 * scale);

      // Draw Photos
      if (themeId === 'classic-1' && loadedPhotos[0]) {
        drawPhotoWithMirror(loadedPhotos[0], margin, y, printWidth, printWidth);
      } else if (themeId === 'duet-1') {
        ctx.fillStyle = '#000000';
        ctx.fillRect(margin, y, printWidth, printWidth);
        const size = (printWidth - Math.round(6 * scale)) / 2;
        for (let i = 0; i < 4; i++) {
          const img = loadedPhotos[i];
          if (img) {
            const col = i % 2;
            const row = Math.floor(i / 2);
            const px = margin + col * (size + Math.round(6 * scale));
            const py = y + row * (size + Math.round(6 * scale));
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
      y += printWidth + Math.round(20 * scale);

      // Draw Footer
      ctx.fillStyle = '#000000';
      ctx.fillRect(margin, y, printWidth, Math.round(2 * scale));
      y += Math.round(6 * scale);

      ctx.save();
      ctx.font = `900 ${Math.round(36 * scale)}px "Space Grotesk", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText((metadata.homeSubtitleBottom || 'EVENT NAME').toUpperCase(), width / 2, y + Math.round(32 * scale));
      ctx.restore();
      y += Math.round(40 * scale);

      ctx.fillRect(margin, y, printWidth, Math.round(2 * scale));
      y += Math.round(12 * scale);

      ctx.save();
      ctx.font = `bold ${Math.round(15 * scale)}px "Space Grotesk", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(metadata.timestamp.split(',')[0], width / 2, y + Math.round(12 * scale));
      ctx.restore();
      y += Math.round(20 * scale);

      // Draw Scan Section (Barcode only)
      ctx.save();
      ctx.font = `bold ${Math.round(14 * scale)}px "Courier Prime", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(dashedLine, width / 2, y + Math.round(11 * scale));
      ctx.restore();
      y += Math.round(20 * scale);

      const barcodeW = Math.round(240 * scale);
      const barcodeX = (width - barcodeW) / 2;
      drawBarcode(ctx, barcodeX, y, barcodeW, Math.round(45 * scale));

      ctx.save();
      ctx.font = `bold ${Math.round(11 * scale)}px "Courier Prime", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`NO. ${metadata.receiptNumber}`, width / 2, y + Math.round(58 * scale));
      ctx.restore();
      
    } else if (themeId === 'classic-2') {
      // Draw standard logo header
      if (logoImg) {
        const logoW = logoImg.width * (logoH / logoImg.height);
        ctx.drawImage(logoImg, (width - logoW) / 2, y, logoW, logoH);
        y += logoH;
      } else {
        ctx.save();
        ctx.font = `bold ${Math.round(25 * scale)}px "Playfair Display", Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.fillText(metadata.cafeName.toUpperCase(), width / 2, y + Math.round(20 * scale));
        ctx.restore();
        y += Math.round(30 * scale);
      }
      y += Math.round(6 * scale);

      // Draw Header
      ctx.save();
      ctx.font = `bold ${Math.round(12 * scale)}px "Space Grotesk", sans-serif`;
      ctx.textAlign = 'right';
      ctx.fillText('✈ POWERED BY BLCKLABS', width - margin, y + Math.round(11 * scale));
      ctx.restore();
      y += Math.round(18 * scale);

      // Draw Photo
      if (loadedPhotos[0]) {
        drawPhotoWithMirror(loadedPhotos[0], margin, y, printWidth, printWidth);
      }
      y += printWidth + Math.round(20 * scale);

      // Draw Info Grid
      ctx.save();
      ctx.font = `bold ${Math.round(10 * scale)}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = '#666666';
      ctx.textAlign = 'left';
      ctx.fillText('DATE', margin, y + Math.round(9 * scale));
      ctx.fillText('GATE', margin + Math.round(115 * scale), y + Math.round(9 * scale));
      ctx.fillText('TIME', margin + Math.round(250 * scale), y + Math.round(9 * scale));
      
      ctx.font = `900 ${Math.round(13 * scale)}px "Space Grotesk", sans-serif`;
      ctx.fillStyle = '#000000';
      ctx.fillText(metadata.timestamp.split(',')[0], margin, y + Math.round(25 * scale));
      ctx.fillText(metadata.cafeAddress.split(',')[0] || 'PASTORAL', margin + Math.round(115 * scale), y + Math.round(25 * scale));
      ctx.fillText(metadata.timestamp.split(',')[1]?.trim().slice(0, 5) || '15:40', margin + Math.round(250 * scale), y + Math.round(25 * scale));
      ctx.restore();
      y += Math.round(34 * scale);

      // Dashed separator line
      ctx.save();
      ctx.font = `bold ${Math.round(14 * scale)}px "Courier Prime", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(dashedLine, width / 2, y + Math.round(11 * scale));
      ctx.restore();
      y += Math.round(18 * scale);

      // Flight Codes
      ctx.save();
      ctx.font = `900 ${Math.round(42 * scale)}px "Space Grotesk", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('DXB  ✈  HKG', width / 2, y + Math.round(36 * scale));
      
      ctx.font = `bold ${Math.round(12 * scale)}px "Space Grotesk", sans-serif`;
      ctx.fillText('B O A R D I N G   P A S S', width / 2, y + Math.round(54 * scale));
      ctx.restore();
      y += Math.round(64 * scale);

      // Draw Scan Section (Barcode only)
      const barcodeW = Math.round(240 * scale);
      const barcodeX = (width - barcodeW) / 2;
      drawBarcode(ctx, barcodeX, y, barcodeW, Math.round(45 * scale));

      ctx.save();
      ctx.font = `bold ${Math.round(11 * scale)}px "Courier Prime", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`NO. ${metadata.receiptNumber}`, width / 2, y + Math.round(58 * scale));
      ctx.restore();
      
    } else if (themeId === 'film-1') {
      // Draw standard logo header
      if (logoImg) {
        const logoW = logoImg.width * (logoH / logoImg.height);
        ctx.drawImage(logoImg, (width - logoW) / 2, y, logoW, logoH);
        y += logoH;
      } else {
        ctx.save();
        ctx.font = `bold ${Math.round(25 * scale)}px "Playfair Display", Georgia, serif`;
        ctx.textAlign = 'center';
        ctx.fillText(metadata.cafeName.toUpperCase(), width / 2, y + Math.round(20 * scale));
        ctx.restore();
        y += Math.round(30 * scale);
      }
      y += Math.round(10 * scale);

      ctx.fillRect(margin, y, printWidth, Math.round(2 * scale));
      y += Math.round(12 * scale);

      // Draw stacked 3 landscape photos
      ctx.fillStyle = '#000000';
      const pHeight = Math.round(printWidth / 1.5);
      const stackHeight = (pHeight + Math.round(6 * scale)) * 3 - Math.round(6 * scale);
      ctx.fillRect(margin, y, printWidth, stackHeight);
      for (let i = 0; i < 3; i++) {
        const img = loadedPhotos[i];
        if (img) {
          const py = y + i * (pHeight + Math.round(6 * scale));
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
      y += stackHeight + Math.round(20 * scale);

      // Draw Footer
      ctx.fillStyle = '#000000';
      ctx.fillRect(margin, y, printWidth, Math.round(2 * scale));
      y += Math.round(6 * scale);

      ctx.save();
      ctx.font = `900 ${Math.round(36 * scale)}px "Space Grotesk", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText((metadata.homeSubtitleBottom || 'EVENT NAME').toUpperCase(), width / 2, y + Math.round(32 * scale));
      ctx.restore();
      y += Math.round(40 * scale);

      ctx.fillRect(margin, y, printWidth, Math.round(2 * scale));
      y += Math.round(12 * scale);

      ctx.save();
      ctx.font = `bold ${Math.round(15 * scale)}px "Space Grotesk", sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(metadata.timestamp.split(',')[0], width / 2, y + Math.round(12 * scale));
      ctx.restore();
      y += Math.round(20 * scale);

      // Draw Scan Section (Barcode only)
      ctx.save();
      ctx.font = `bold ${Math.round(14 * scale)}px "Courier Prime", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(dashedLine, width / 2, y + Math.round(11 * scale));
      ctx.restore();
      y += Math.round(20 * scale);

      const barcodeW = Math.round(240 * scale);
      const barcodeX = (width - barcodeW) / 2;
      drawBarcode(ctx, barcodeX, y, barcodeW, Math.round(45 * scale));

      ctx.save();
      ctx.font = `bold ${Math.round(11 * scale)}px "Courier Prime", monospace`;
      ctx.textAlign = 'center';
      ctx.fillText(`NO. ${metadata.receiptNumber}`, width / 2, y + Math.round(58 * scale));
      ctx.restore();
    }

    ctx.filter = 'none';
    return;
  }

  let y = paddingTop;

  // 1. Draw Cafe Logo or Cafe Name at Header
  if (logoImg) {
    const logoW = logoImg.width * (logoH / logoImg.height);
    ctx.drawImage(logoImg, (width - logoW) / 2, y, logoW, logoH);
    y += logoH;
  } else {
    ctx.font = `bold ${Math.round(25 * scale)}px "Playfair Display", Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.fillText(metadata.cafeName.toUpperCase(), width / 2, y + Math.round(20 * scale));
    y += Math.round(30 * scale);
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
      const size = Math.round(90 * scale);
      ctx.drawImage(svgImg, (width - size) / 2, y, size, size);
      y += size + Math.round(16 * scale);
    } catch (e) {
      console.warn('Failed to load comfort card SVG:', e);
      y += Math.round(90 * scale) + Math.round(16 * scale);
    }

    ctx.font = `bold ${Math.round(14 * scale)}px "Courier Prime", "Courier New", Courier, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(dottedLine, width / 2, y + Math.round(10 * scale));
    y += Math.round(22 * scale);

    ctx.font = `bold ${Math.round(19 * scale)}px "Courier Prime", "Courier New", Courier, monospace`;
    ctx.fillText('COMFORT CARD', width / 2, y + Math.round(10 * scale));
    y += Math.round(25 * scale);

    ctx.font = `bold ${Math.round(18 * scale)}px "Courier Prime", "Courier New", Courier, monospace`;
    for (const line of comfortLines) {
      ctx.fillText(line, width / 2, y + Math.round(10 * scale));
      y += Math.round(22 * scale);
    }
    y += Math.round(10 * scale);
  } else if (templateId === 'classic-solo' && loadedPhotos[0]) {
    drawPhotoWithMirror(loadedPhotos[0], margin, y, printWidth, printWidth);
    if (themeImg) {
      ctx.drawImage(themeImg, margin, y, printWidth, printWidth);
    }
    y += printWidth;
  } else if (templateId === 'duet-grid') {
    const size = (printWidth - Math.round(8 * scale)) / 2;
    for (let i = 0; i < 4; i++) {
      const img = loadedPhotos[i];
      if (img) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const px = margin + col * (size + Math.round(8 * scale));
        const py = y + row * (size + Math.round(8 * scale));
        drawPhotoWithMirror(img, px, py, size, size);
      }
    }
    if (themeImg) {
      ctx.drawImage(themeImg, margin, y, printWidth, printWidth);
    }
    y += size * 2 + Math.round(8 * scale);
  } else if (templateId === 'film-stack') {
    const pHeight = Math.round(printWidth / 1.5);
    const stackHeight = (pHeight + Math.round(8 * scale)) * 3 - Math.round(8 * scale);
    for (let i = 0; i < 3; i++) {
      const img = loadedPhotos[i];
      if (img) {
        const py = y + i * (pHeight + Math.round(8 * scale));
        drawPhotoWithMirror(img, margin, py, printWidth, pHeight);
      }
    }
    if (themeImg) {
      ctx.drawImage(themeImg, margin, y, printWidth, stackHeight);
    }
    y += stackHeight;
  } else if (templateId === 'hex-grid') {
    const sizeW = (printWidth - Math.round(8 * scale)) / 2;
    const sizeH = Math.round(sizeW / 1.5);
    for (let i = 0; i < 6; i++) {
      const img = loadedPhotos[i];
      if (img) {
        const col = i % 2;
        const row = Math.floor(i / 2);
        const px = margin + col * (sizeW + Math.round(8 * scale));
        const py = y + row * (sizeH + Math.round(8 * scale));
        drawPhotoWithMirror(img, px, py, sizeW, sizeH);
      }
    }
    y += (sizeH + Math.round(8 * scale)) * 3 - Math.round(8 * scale);
  }

  ctx.filter = 'none';
  y += spacingAfterGrid;

  // 3. Draw QR Code if available
  if (qrImg) {
    // Draw divider dots
    ctx.font = `bold ${Math.round(12 * scale)}px "Courier Prime", "Courier New", Courier, monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(dottedLine, width / 2, y + Math.round(10 * scale));
    y += Math.round(18 * scale);

    // Draw "SCAN FOR DIGITAL COPY" text
    ctx.font = `bold ${Math.round(12 * scale)}px "Space Grotesk", Arial, sans-serif`;
    ctx.fillText('SCAN FOR DIGITAL COPY', width / 2, y + Math.round(10 * scale));
    y += Math.round(18 * scale);

    // Draw QR image centered
    ctx.drawImage(qrImg, (width - qrSize) / 2, y, qrSize, qrSize);
    y += qrSize;

    // Draw link text
    ctx.font = `${Math.round(11 * scale)}px "Space Grotesk", Arial, sans-serif`;
    ctx.fillText('photoreceipt.stoodioph.com', width / 2, y + Math.round(10 * scale));
    y += Math.round(18 * scale);
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

  ctx.font = `bold ${Math.round(15 * scale)}px "Courier Prime", "Courier New", Courier, monospace`;
  ctx.textAlign = 'left';
  ctx.fillText(metadata.cafeAddress.toUpperCase(), margin, y + Math.round(10 * scale));
  ctx.textAlign = 'right';
  ctx.fillText(formattedDate, width - margin, y + Math.round(10 * scale));

  y += footerHeight;

  if (hasFortune) {
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';

    // 1. Divider dots
    ctx.font = `bold ${Math.round(14 * scale)}px "Courier Prime", "Courier New", Courier, monospace`;
    ctx.fillText(dottedLine, width / 2, y + Math.round(10 * scale));
    y += Math.round(22 * scale);

    // 2. Title "MEMORY FORTUNE"
    ctx.font = `bold ${Math.round(16 * scale)}px "Courier Prime", "Courier New", Courier, monospace`;
    ctx.fillText('MEMORY FORTUNE', width / 2, y + Math.round(10 * scale));
    y += Math.round(22 * scale);

    // 3. Quote text lines
    ctx.font = `bold ${Math.round(16 * scale)}px "Courier Prime", "Courier New", Courier, monospace`;
    for (const line of fortuneLines) {
      ctx.fillText(line, width / 2, y + Math.round(10 * scale));
      y += Math.round(20 * scale);
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

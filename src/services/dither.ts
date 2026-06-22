/**
 * Image processing service for simulating high-quality retro grayscale photobooth aesthetics.
 * Resizes the photo to a target print width and converts to smooth grayscale with contrast adjustments.
 */

export function ditherImage(
  imageSrc: string,
  targetWidth = 720
): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      // Calculate height maintaining aspect ratio
      const aspectRatio = img.naturalHeight / img.naturalWidth;
      const targetHeight = Math.round(targetWidth * aspectRatio);

      // Create a canvas to downscale and process
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get 2D context'));
        return;
      }

      // Draw and downscale image to canvas
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

      // Extract image data
      const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
      const data = imageData.data;

      // Convert to smooth grayscale and apply contrast, brightness, and gamma correction for premium thermal prints
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Standard luminance weights
        let gray = 0.299 * r + 0.587 * g + 0.114 * b;

        // Lift shadows and midtones using gamma correction (makes faces much lighter and clearer)
        gray = Math.pow(gray / 255, 0.72) * 255;

        // Boost contrast slightly (keeps details crisp)
        const contrastFactor = 1.15;
        gray = (gray - 128) * contrastFactor + 128;

        // Brightness offset to wash out solid black areas slightly
        gray = gray + 15;
        gray = Math.max(0, Math.min(255, gray));

        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
        // Keep transparency alpha unchanged
      }

      // Put the modified pixels back
      ctx.putImageData(imageData, 0, 0);

      // Resolve directly as base64 Data URL to prevent SVG iframe/image sandbox blocks
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = (e) => {
      reject(e);
    };

    img.src = imageSrc;
  });
}

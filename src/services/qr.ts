import QRCode from 'qrcode';

/**
 * Generates a local Blob Object URL for a QR Code encoding the provided string.
 * This prevents thermal printers from printing raw base64 code text by keeping URL sizes minimal.
 */
export async function generateQRCode(text: string): Promise<string> {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: 180,
      margin: 2,
      color: {
        dark: '#1a1a1a', // standard receipt dark gray
        light: '#ffffff', // match print paper background
      },
      errorCorrectionLevel: 'M',
    });
    
    // Convert base64 data URL to local Object URL
    return dataURLtoObjectURL(dataUrl);
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    return '';
  }
}

/**
 * Decodes base64 Data URLs and returns a local Blob URL.
 */
function dataURLtoObjectURL(dataurl: string): string {
  try {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const blob = new Blob([u8arr], { type: mime });
    return URL.createObjectURL(blob);
  } catch (e) {
    console.error('Failed to convert base64 to Blob URL:', e);
    return dataurl; // fallback to original dataUrl
  }
}

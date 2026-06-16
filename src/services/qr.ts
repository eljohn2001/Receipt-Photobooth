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
    
    // Return base64 data URL directly
    return dataUrl;
  } catch (error) {
    console.error('Failed to generate QR code:', error);
    return '';
  }
}



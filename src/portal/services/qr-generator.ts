import QRCode from 'qrcode';

export async function generatePackageQrDataUrl(qrText: string): Promise<string> {
  try {
    return await QRCode.toDataURL(qrText, {
      width: 280,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Error generating package QR code:', err);
    return '';
  }
}

export function printPackageQrCard(packageName: string, price: number, qrDataUrl: string): void {
  const printWin = window.open('', '_blank', 'width=500,height=600');
  if (!printWin) {
    alert('Pop-up blocked! Please allow pop-ups to print package QR code.');
    return;
  }

  printWin.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Print QR — ${packageName}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 20px;
          text-align: center;
          color: #0f172a;
        }
        .card {
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          padding: 24px;
          max-width: 320px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.08);
        }
        h2 { font-size: 20px; margin: 0 0 4px; }
        .price { font-size: 28px; font-weight: 800; color: #6366f1; margin-bottom: 16px; }
        img { width: 220px; height: 220px; border-radius: 8px; margin-bottom: 16px; }
        .instructions { font-size: 12px; color: #64748b; margin-top: 8px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h2>Snapreceipt™ Package Code</h2>
        <div class="price">₱${price.toFixed(2)}</div>
        <h3>${packageName}</h3>
        <img src="${qrDataUrl}" alt="Package QR Code" />
        <div class="instructions">Scan this QR code at any Snapreceipt™ Booth scanner to immediately pay and activate this package.</div>
      </div>
      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 1000);
        }
      </script>
    </body>
    </html>
  `);
  printWin.document.close();
}

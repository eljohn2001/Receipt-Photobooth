export interface ParsedPackageQr {
  raw: string;
  packageId: string;
  printsCount?: number;
  photoCount?: number;
  allowedLayouts?: string[];
  templateCollection?: string;
  promoCode?: string;
  rawParams: Record<string, string>;
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Parses pipe-delimited QR content provided by cashier or scanner.
 * Examples:
 *   "PACKAGE_A|PRINTS=1"
 *   "PACKAGE_B|PRINTS=2"
 *   "PACKAGE_C|PRINTS=3|PHOTOS=3|LAYOUTS=classic-solo,duet-grid"
 */
export function parsePackageQrData(qrText: string): ParsedPackageQr {
  const result: ParsedPackageQr = {
    raw: qrText,
    packageId: '',
    rawParams: {},
    isValid: false
  };

  if (!qrText || typeof qrText !== 'string') {
    result.errorMessage = 'Empty QR Code content';
    return result;
  }

  const trimmed = qrText.trim();
  if (!trimmed) {
    result.errorMessage = 'Empty QR Code content';
    return result;
  }

  // Split by pipe '|'
  const tokens = trimmed.split('|').map(t => t.trim()).filter(Boolean);
  if (tokens.length === 0) {
    result.errorMessage = 'Invalid QR Code format';
    return result;
  }

  // First token is Package ID (e.g. PACKAGE_A, PACKAGE_B, pkg-a, etc.)
  let primaryToken = tokens[0];

  // If first token contains '=', check if it's a key=value or if it starts with package identifier
  if (primaryToken.includes('=')) {
    const [k, v] = primaryToken.split('=').map(s => s.trim());
    if (k.toUpperCase() === 'PACKAGE' || k.toUpperCase() === 'PACKAGE_ID' || k.toUpperCase() === 'PKG') {
      result.packageId = v.toUpperCase();
    } else {
      result.rawParams[k.toUpperCase()] = v;
    }
  } else {
    result.packageId = primaryToken.toUpperCase();
  }

  // Process subsequent pipe-delimited key=value parameters dynamically
  for (let i = 1; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.includes('=')) {
      const eqIdx = token.indexOf('=');
      const key = token.substring(0, eqIdx).trim().toUpperCase();
      const val = token.substring(eqIdx + 1).trim();
      result.rawParams[key] = val;
    } else if (!result.packageId) {
      result.packageId = token.toUpperCase();
    }
  }

  // Map known fields if present
  if (result.rawParams['PRINTS']) {
    const p = parseInt(result.rawParams['PRINTS'], 10);
    if (!isNaN(p) && p > 0) {
      result.printsCount = p;
    }
  }

  if (result.rawParams['PHOTOS'] || result.rawParams['PHOTO_COUNT']) {
    const ph = parseInt(result.rawParams['PHOTOS'] || result.rawParams['PHOTO_COUNT'], 10);
    if (!isNaN(ph) && ph > 0) {
      result.photoCount = ph;
    }
  }

  if (result.rawParams['LAYOUTS'] || result.rawParams['ALLOWED_LAYOUTS']) {
    const layoutsStr = result.rawParams['LAYOUTS'] || result.rawParams['ALLOWED_LAYOUTS'];
    result.allowedLayouts = layoutsStr.split(',').map(l => l.trim()).filter(Boolean);
  }

  if (result.rawParams['TEMPLATE']) {
    result.templateCollection = result.rawParams['TEMPLATE'];
  }

  if (result.rawParams['PROMO'] || result.rawParams['PROMOTIONAL']) {
    result.promoCode = result.rawParams['PROMO'] || result.rawParams['PROMOTIONAL'];
  }

  if (result.packageId) {
    result.isValid = true;
  } else {
    result.errorMessage = 'Could not determine Package ID from QR Code';
  }

  return result;
}

/**
 * Helper to build standard QR data string preview
 */
export function buildPackageQrData(packageId: string, printsCount: number, extraParams?: Record<string, string>): string {
  let cleanId = (packageId || 'PACKAGE_A').toUpperCase().trim();
  if (cleanId.startsWith('PKG-')) {
    cleanId = cleanId.replace('PKG-', 'PACKAGE_');
  }
  let base = `${cleanId}|PRINTS=${printsCount}`;
  if (extraParams) {
    for (const [k, v] of Object.entries(extraParams)) {
      if (k.toUpperCase() !== 'PRINTS' && v) {
        base += `|${k.toUpperCase()}=${v}`;
      }
    }
  }
  return base;
}

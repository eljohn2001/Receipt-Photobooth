/**
 * Animated SVG Icon Components for Snapreceipt™ Kiosk
 * Pure CSS/SVG vector micro-animations (100% offline safe & 60 FPS GPU-accelerated)
 */

export function renderAnimatedCameraQrIcon(size: number = 40): string {
  return `
    <div class="anim-icon-wrapper anim-camera-qr" style="width: ${size}px; height: ${size}px;">
      <svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" class="anim-svg">
        <!-- Outer camera frame -->
        <rect x="6" y="10" width="36" height="28" rx="6" stroke="currentColor" stroke-width="3" fill="none" class="svg-camera-body" />
        <path d="M16 10L20 6H28L32 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" class="svg-camera-top" />
        
        <!-- Lens ring with pulse -->
        <circle cx="24" cy="24" r="8" stroke="currentColor" stroke-width="3" fill="none" class="svg-lens-ring" />
        <circle cx="24" cy="24" r="4" fill="currentColor" class="svg-lens-core" />
        
        <!-- Corner brackets -->
        <path d="M12 18V14H16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="svg-corner" />
        <path d="M36 18V14H32" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="svg-corner" />
        <path d="M12 30V34H16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="svg-corner" />
        <path d="M36 30V34H32" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="svg-corner" />

        <!-- Sweeping laser bar -->
        <line x1="10" y1="24" x2="38" y2="24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="svg-laser-line" />
      </svg>
    </div>
  `;
}

export function renderAnimatedPhoneQrIcon(size: number = 40): string {
  return `
    <div class="anim-icon-wrapper anim-phone-qr" style="width: ${size}px; height: ${size}px;">
      <svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" class="anim-svg">
        <!-- Phone body -->
        <rect x="12" y="6" width="24" height="36" rx="5" stroke="currentColor" stroke-width="3" fill="none" class="svg-phone-body" />
        
        <!-- Home indicator line -->
        <line x1="20" y1="37" x2="28" y2="37" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
        
        <!-- Display screen QR code grid -->
        <rect x="18" y="14" width="5" height="5" fill="currentColor" class="svg-qr-blk b1" />
        <rect x="25" y="14" width="5" height="5" fill="currentColor" class="svg-qr-blk b2" />
        <rect x="18" y="21" width="5" height="5" fill="currentColor" class="svg-qr-blk b3" />
        <rect x="25" y="21" width="5" height="5" stroke="currentColor" stroke-width="2.5" class="svg-qr-blk b4" />

        <!-- Signal waves radiating outward -->
        <path d="M38 16C40.5 19 40.5 25 38 28" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="svg-signal-wave w1" />
        <path d="M10 16C7.5 19 7.5 25 10 28" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="svg-signal-wave w2" />
      </svg>
    </div>
  `;
}

export function renderAnimatedCashRegisterIcon(size: number = 40): string {
  return `
    <div class="anim-icon-wrapper anim-cash-register" style="width: ${size}px; height: ${size}px;">
      <svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" class="anim-svg">
        <!-- Register base -->
        <rect x="8" y="24" width="32" height="18" rx="3" stroke="currentColor" stroke-width="3" fill="none" />
        
        <!-- Keys grid -->
        <circle cx="16" cy="30" r="1.5" fill="currentColor" />
        <circle cx="24" cy="30" r="1.5" fill="currentColor" />
        <circle cx="32" cy="30" r="1.5" fill="currentColor" />
        <circle cx="16" cy="36" r="1.5" fill="currentColor" />
        <circle cx="24" cy="36" r="1.5" fill="currentColor" />
        <circle cx="32" cy="36" r="1.5" fill="currentColor" />

        <!-- Screen display -->
        <rect x="16" y="6" width="16" height="12" rx="2" stroke="currentColor" stroke-width="2.5" />
        <line x1="24" y1="18" x2="24" y2="24" stroke="currentColor" stroke-width="3" />

        <!-- Animated cash receipt popping up -->
        <path d="M20 12H28V6H20V12Z" fill="currentColor" opacity="0.3" class="svg-receipt-pop" />
      </svg>
    </div>
  `;
}

export function renderAnimatedCheckmarkIcon(size: number = 52): string {
  return `
    <div class="anim-icon-wrapper anim-checkmark" style="width: ${size}px; height: ${size}px;">
      <svg width="${size}" height="${size}" viewBox="0 0 52 52" fill="none" class="anim-svg">
        <circle cx="26" cy="26" r="23" stroke="#34c759" stroke-width="3" fill="none" class="svg-check-circle" />
        <path d="M15 27L22.5 34.5L37 19.5" stroke="#34c759" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" class="svg-check-path" />
      </svg>
    </div>
  `;
}

export function renderAnimatedHeartIcon(size: number = 32): string {
  return `
    <div class="anim-icon-wrapper anim-heart-beat" style="width: ${size}px; height: ${size}px;">
      <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor" class="anim-svg svg-heart">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    </div>
  `;
}

export function renderAnimatedEnvelopeIcon(size: number = 40): string {
  return `
    <div class="anim-icon-wrapper anim-envelope-wave" style="width: ${size}px; height: ${size}px;">
      <svg width="${size}" height="${size}" viewBox="0 0 48 48" fill="none" class="anim-svg">
        <rect x="6" y="12" width="36" height="24" rx="4" stroke="currentColor" stroke-width="3" fill="none" />
        <path d="M6 14L24 26L42 14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <!-- Floating heart note out of envelope -->
        <path d="M24 16C23 15 21 15 21 17C21 19 24 21 24 21C24 21 27 19 27 17C27 15 25 15 24 16Z" fill="#34c759" class="svg-envelope-heart" />
      </svg>
    </div>
  `;
}

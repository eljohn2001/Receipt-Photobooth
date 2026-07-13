import './style.css';
import type { AppSession, AppState, PrintPackage } from './types';
import { ActivationView } from './views/activation';
import { IdleView } from './views/idle';
import { TemplateView } from './views/template';
import { PackageSelectionView } from './views/package-selection';
import { OrderSummaryView } from './views/order-summary';
import { CaptureView } from './views/capture';
import { PreviewView } from './views/preview';
import { PrintingView } from './views/printing';
import { FinishedView } from './views/finished';
import { BaseView } from './views/base';
import { ModeSelectionView } from './views/mode-selection';
import { AdminPanelView } from './views/admin-panel';
import { loadKioskConfig, saveKioskConfig, resetKioskConfig, type KioskConfig } from './services/config';
import { getBackgroundMedia, saveBackgroundMedia, deleteBackgroundMedia, listOfflineShares, deleteOfflineShare, listLocalSessions } from './services/db';
import { checkLicenseOnStartup, deactivateLicense, getDeviceUUID } from './services/license';
import { uploadReceiptPhotos } from './services/upload';
import { audioManager } from './services/audio';
import { getShareRecord, getPublicStorageUrl, supabase } from './services/supabase';
import { syncPendingSessions, updateBoothTelemetry } from './services/sync';
import defaultSnapHome from './assets/Snap Home.png';

function renderDownloadPage(
  photoUrl: string | null,
  photoBw: string | null = null,
  photoColor: string | null = null
) {
  const isTabbed = !!(photoBw && photoColor);
  const activePhoto = photoBw || photoUrl || '';

  document.body.innerHTML = `
    <div class="download-page-container">
      <div class="download-page-card">
        <div class="download-page-header">
          <h1 class="download-title">YOUR MEMORY</h1>
          <p class="download-subtitle">Beans & Bites Photo Booth</p>
        </div>
        
        ${isTabbed ? `
        <div class="download-toggle-tabs">
          <button class="tab-btn active" id="tab-bw">🖤 VINTAGE B&W</button>
          <button class="tab-btn" id="tab-color">💛 ORIGINAL COLOR</button>
        </div>
        ` : ''}
        
        <div class="download-image-wrapper">
          ${isTabbed ? `
          <img class="download-receipt-image" id="receipt-img-bw" src="${photoBw}" alt="Vintage B&W Receipt" onerror="const card = this.closest('.download-page-card'); if (card) { card.innerHTML = \`<div class=&quot;download-page-header&quot;><h1 class=&quot;download-title&quot; style=&quot;color: #e03131; font-weight: 700;&quot;>⚠️ DOWNLOAD EXPIRED</h1><p class=&quot;download-subtitle&quot;>Digital copies are only available for 1 hour.</p></div><div style=&quot;font-size: 64px; margin: 30px 0;&quot;>⏳</div><p style=&quot;font-size: 13px; color: #555; line-height: 1.6; max-width: 300px; margin: 0 auto 24px;&quot;>For privacy and security, softcopies are deleted automatically 1 hour after printing.</p><div class=&quot;download-page-footer&quot;>powered by blcklabs</div>\`; }" />
          <img class="download-receipt-image hidden" id="receipt-img-color" src="${photoColor}" alt="Color Receipt" onerror="const card = this.closest('.download-page-card'); if (card) { card.innerHTML = \`<div class=&quot;download-page-header&quot;><h1 class=&quot;download-title&quot; style=&quot;color: #e03131; font-weight: 700;&quot;>⚠️ DOWNLOAD EXPIRED</h1><p class=&quot;download-subtitle&quot;>Digital copies are only available for 1 hour.</p></div><div style=&quot;font-size: 64px; margin: 30px 0;&quot;>⏳</div><p style=&quot;font-size: 13px; color: #555; line-height: 1.6; max-width: 300px; margin: 0 auto 24px;&quot;>For privacy and security, softcopies are deleted automatically 1 hour after printing.</p><div class=&quot;download-page-footer&quot;>powered by blcklabs</div>\`; }" />
          ` : `
          <img class="download-receipt-image" src="${photoUrl}" alt="Photo Receipt" onerror="const card = this.closest('.download-page-card'); if (card) { card.innerHTML = \`<div class=&quot;download-page-header&quot;><h1 class=&quot;download-title&quot; style=&quot;color: #e03131; font-weight: 700;&quot;>⚠️ DOWNLOAD EXPIRED</h1><p class=&quot;download-subtitle&quot;>Digital copies are only available for 1 hour.</p></div><div style=&quot;font-size: 64px; margin: 30px 0;&quot;>⏳</div><p style=&quot;font-size: 13px; color: #555; line-height: 1.6; max-width: 300px; margin: 0 auto 24px;&quot;>For privacy and security, softcopies are deleted automatically 1 hour after printing.</p><div class=&quot;download-page-footer&quot;>powered by blcklabs</div>\`; }" />
          `}
        </div>
        
        <div class="download-instructions">
          <p class="instruction-main">Tap and hold (long press) the image above to save it to your Photos/Gallery.</p>
          <p class="instruction-sub">Or click the button below to download directly:</p>
        </div>
        
        <a href="${activePhoto}" download="${isTabbed ? 'receipt-bw.png' : 'receipt-photo.png'}" class="btn-download-action" id="btn-download-link">
          💾 ${isTabbed ? 'DOWNLOAD VINTAGE B&W' : 'DOWNLOAD PHOTO'}
        </a>
        
        <div class="download-page-footer">
          powered by blcklabs
        </div>
      </div>
    </div>
  `;

  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    body {
      background-color: #f5f5f5 !important;
      color: #000000 !important;
      font-family: "Space Grotesk", -apple-system, BlinkMacSystemFont, sans-serif !important;
      display: flex !important;
      justify-content: center !important;
      align-items: center !important;
      min-height: 100vh !important;
      width: 100% !important;
      margin: 0 !important;
      padding: 20px !important;
      box-sizing: border-box !important;
      overflow-y: auto !important;
    }
    .download-page-container {
      width: 100%;
      max-width: 420px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .download-page-card {
      background-color: #ffffff;
      border: 1px solid rgba(0, 0, 0, 0.1);
      padding: 30px 24px;
      width: 100%;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }
    .download-page-header {
      margin-bottom: 24px;
    }
    .download-title {
      font-family: "Playfair Display", serif;
      font-size: 26px;
      font-weight: 400;
      letter-spacing: 2px;
      margin: 0 0 4px 0;
      text-transform: uppercase;
    }
    .download-subtitle {
      font-size: 13px;
      color: #666666;
      margin: 0;
    }
    
    /* Toggle Tabs */
    .download-toggle-tabs {
      display: flex;
      width: 100%;
      border: 1px solid #000000;
      margin-bottom: 24px;
      box-sizing: border-box;
    }
    .tab-btn {
      flex: 1;
      background: #ffffff;
      color: #000000;
      border: none;
      padding: 12px;
      font-size: 11px;
      font-weight: 700;
      cursor: pointer;
      text-transform: uppercase;
      letter-spacing: 1px;
      font-family: "Space Grotesk", sans-serif;
      transition: all 0.2s;
    }
    .tab-btn.active {
      background: #000000;
      color: #ffffff;
    }
    .tab-btn:not(.active):hover {
      background: #f5f5f5;
    }
    .hidden {
      display: none !important;
    }

    .download-image-wrapper {
      width: 100%;
      border: 1px solid #000000;
      padding: 8px;
      background-color: #ffffff;
      box-sizing: border-box;
      margin-bottom: 24px;
    }
    .download-receipt-image {
      width: 100%;
      height: auto;
      display: block;
    }
    .download-instructions {
      margin-bottom: 24px;
      padding: 0 10px;
    }
    .instruction-main {
      font-size: 13px;
      font-weight: 500;
      color: #000000;
      line-height: 1.5;
      margin: 0 0 8px 0;
    }
    .instruction-sub {
      font-size: 11px;
      color: #666666;
      margin: 0;
    }
    .btn-download-action {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      background-color: #000000;
      color: #ffffff !important;
      text-decoration: none !important;
      font-size: 13px;
      font-weight: 600;
      padding: 14px 24px;
      width: 100%;
      box-sizing: border-box;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      transition: opacity 0.2s;
      cursor: pointer;
    }
    .btn-download-action:hover {
      opacity: 0.8;
    }
    .download-page-footer {
      margin-top: 30px;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: rgba(0, 0, 0, 0.4);
    }
  `;
  document.head.appendChild(styleEl);

  if (isTabbed) {
    const tabBw = document.getElementById('tab-bw');
    const tabColor = document.getElementById('tab-color');
    const imgBw = document.getElementById('receipt-img-bw');
    const imgColor = document.getElementById('receipt-img-color');
    const downloadLink = document.getElementById('btn-download-link');

    if (tabBw && tabColor && imgBw && imgColor && downloadLink) {
      tabBw.addEventListener('click', () => {
        tabBw.classList.add('active');
        tabColor.classList.remove('active');
        imgBw.classList.remove('hidden');
        imgColor.classList.add('hidden');
        downloadLink.setAttribute('href', photoBw || '');
        downloadLink.setAttribute('download', 'receipt-bw.png');
        downloadLink.innerHTML = '💾 DOWNLOAD VINTAGE B&W';
      });

      tabColor.addEventListener('click', () => {
        tabColor.classList.add('active');
        tabBw.classList.remove('active');
        imgColor.classList.remove('hidden');
        imgBw.classList.add('hidden');
        downloadLink.setAttribute('href', photoColor || '');
        downloadLink.setAttribute('download', 'receipt-color.png');
        downloadLink.innerHTML = '💾 DOWNLOAD COLOR PHOTO';
      });
    }
  }
}

// 1. Check for routing parameters on startup (admin page or download page)
const urlParams = new URLSearchParams(window.location.search);
const shareId = urlParams.get('id');
const photoUrl = urlParams.get('photo');
const photoBw = urlParams.get('photo_bw');
const photoColor = urlParams.get('photo_color');
const isAdminRoute = window.location.pathname.startsWith('/admin') || urlParams.has('admin');

if (isAdminRoute) {
  // Clear the page structure and render the Admin Dashboard
  const adminContainer = document.createElement('div');
  adminContainer.id = 'admin-portal-root';
  document.body.innerHTML = '';
  document.body.appendChild(adminContainer);
  
  const adminView = new AdminPanelView(adminContainer);
  adminView.init().catch(err => console.error('Failed to initialize Admin Panel:', err));
} else if (shareId) {
  // Show a premium loading state first while we fetch from Supabase
  document.body.innerHTML = `
    <div class="download-page-container">
      <div class="download-page-card">
        <div style="font-size: 48px; margin: 30px 0; animation: spin 1.5s linear infinite;">⏳</div>
        <h2 class="download-title">LOADING SECURE MEMORY...</h2>
        <p class="download-subtitle">Retrieving photo booth files</p>
      </div>
    </div>
  `;
  
  // Add quick keyframe rotation to body if not exist
  const spinStyle = document.createElement('style');
  spinStyle.innerHTML = `
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(spinStyle);
  
  getShareRecord(shareId).then((record) => {
    if (record) {
      const bwUrl = getPublicStorageUrl(record.bw_path);
      const colorUrl = getPublicStorageUrl(record.color_path);
      renderDownloadPage(null, bwUrl, colorUrl);
    } else {
      // Show expired screen
      document.body.innerHTML = `
        <div class="download-page-container">
          <div class="download-page-card">
            <div class="download-page-header">
              <h1 class="download-title" style="color: #e03131; font-weight: 700;">⚠️ DOWNLOAD EXPIRED</h1>
              <p class="download-subtitle">Digital copies are only available for 1 hour.</p>
            </div>
            <div style="font-size: 64px; margin: 30px 0;">⏳</div>
            <p style="font-size: 13px; color: #555; line-height: 1.6; max-width: 300px; margin: 0 auto 24px;">For privacy and security, softcopies are deleted automatically 1 hour after printing.</p>
            <div class="download-page-footer">
              powered by blcklabs
            </div>
          </div>
        </div>
      `;
    }
  }).catch((err) => {
    console.error('Failed to load share:', err);
  });
} else if (photoBw && photoColor) {
  renderDownloadPage(null, photoBw, photoColor);
} else if (photoUrl) {
  renderDownloadPage(photoUrl);
} else {
  // 2. Initialize Global Session State
  const session: AppSession = {
  selectedTemplateId: null,
  capturedPhotos: [],
  ditheredPhotos: [],
  metadata: null
};

// 2. Map states to panel IDs and view classes
const stateIndexMap: Record<AppState, number> = {
  'activation': 0,
  'idle': 1,
  'mode-selection': 2,
  'template-selection': 3,
  'package-selection': 4,
  'order-summary': 5,
  'camera-capture': 6,
  'preview': 7,
  'printing': 8,
  'finished': 9
};

let activeBgObjectUrl: string | null = null;

// Global theme application helper
function getLighterColor(hex: string): string {
  if (!hex.startsWith('#')) return hex;
  try {
    const rawHex = hex.slice(1);
    let r = parseInt(rawHex.slice(0, 2), 16);
    let g = parseInt(rawHex.slice(2, 4), 16);
    let b = parseInt(rawHex.slice(4, 6), 16);
    const lighten = (val: number) => Math.min(255, Math.round(val + (255 - val) * 0.25));
    const lr = lighten(r).toString(16).padStart(2, '0');
    const lg = lighten(g).toString(16).padStart(2, '0');
    const lb = lighten(b).toString(16).padStart(2, '0');
    return `#${lr}${lg}${lb}`;
  } catch (e) {
    return hex;
  }
}

async function applyTheme(config: KioskConfig) {
  const root = document.documentElement;
  root.style.setProperty('--bg-primary', config.backgroundColor);
  root.style.setProperty('--bg-secondary', config.backgroundColor);
  root.style.setProperty('--text-primary', config.textColor);
  
  const accentColor = config.accentColor || '#007aff';
  root.style.setProperty('--accent-color', accentColor);
  root.style.setProperty('--accent-secondary', accentColor);
  root.style.setProperty('--curtain-color', config.curtainColor || '#111111');

  // Compute accent RGB
  let accentRgb = '0, 122, 255';
  if (accentColor.startsWith('#')) {
    try {
      const hex = accentColor.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      accentRgb = `${r}, ${g}, ${b}`;
    } catch (e) {
      console.warn('Failed to parse accent color to RGB:', e);
    }
  }
  root.style.setProperty('--accent-color-rgb', accentRgb);

  // Compute dynamic accent gradient
  const lighterAccent = getLighterColor(accentColor);
  root.style.setProperty('--accent-gradient', `linear-gradient(135deg, ${accentColor} 0%, ${lighterAccent} 100%)`);

  // Set home screen split typography colors
  const textHome = config.textColorHome || '#000000';
  root.style.setProperty('--text-home', textHome);
  if (textHome.startsWith('#')) {
    root.style.setProperty('--text-home-secondary', `${textHome}99`);
  } else {
    root.style.setProperty('--text-home-secondary', textHome);
  }
  
  // Create a secondary text color and border color with opacity dynamically
  if (config.textColor.startsWith('#')) {
    root.style.setProperty('--text-secondary', `${config.textColor}99`);
    root.style.setProperty('--border-primary', `${config.textColor}26`); // 15% opacity
  } else {
    root.style.setProperty('--text-secondary', config.textColor);
    root.style.setProperty('--border-primary', 'rgba(0, 0, 0, 0.15)');
  }

  // Dynamically calculate bg-tertiary based on background color luminance
  let bgTertiary = '#f5f5f5'; // default light gray
  if (config.backgroundColor.toLowerCase() === '#000000') {
    bgTertiary = '#111111';
  } else if (config.backgroundColor.startsWith('#')) {
    // Basic hex to RGB to calculate brightness
    try {
      const hex = config.backgroundColor.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      const brightness = (r * 299 + g * 587 + b * 114) / 1000;
      if (brightness < 128) {
         bgTertiary = '#111111'; // dark theme secondary bg
      }
    } catch (e) {
      console.warn('Failed to parse color luminance:', e);
    }
  }
  root.style.setProperty('--bg-tertiary', bgTertiary);

  // Apply home mode classes to show/hide template layout elements
  const idleViewPanel = document.getElementById('view-idle');
  if (idleViewPanel) {
    if (config.homeScreenMode === 'graphic') {
      idleViewPanel.classList.add('home-mode-graphic');
      idleViewPanel.classList.remove('home-mode-layout');
    } else {
      idleViewPanel.classList.add('home-mode-layout');
      idleViewPanel.classList.remove('home-mode-graphic');
    }
  }

  // Apply background photo/video on the isolated welcome container
  const bgContainer = document.getElementById('idle-bg-container');
  if (bgContainer) {
    // Clean up existing background
    bgContainer.style.backgroundImage = 'none';
    bgContainer.innerHTML = '';
    if (activeBgObjectUrl) {
      URL.revokeObjectURL(activeBgObjectUrl);
      activeBgObjectUrl = null;
    }

    let bgLoaded = false;
    if (config.backgroundType) {
      const blob = await getBackgroundMedia();
      if (blob) {
        activeBgObjectUrl = URL.createObjectURL(blob);
        if (config.backgroundType === 'image') {
          bgContainer.style.backgroundImage = `url("${activeBgObjectUrl}")`;
          bgLoaded = true;
        } else if (config.backgroundType === 'video') {
          bgContainer.innerHTML = `
            <video class="idle-background-video" src="${activeBgObjectUrl}" autoplay loop muted playsinline></video>
          `;
          bgLoaded = true;
        }
      }
    }

    if (!bgLoaded) {
      // If we are in 'graphic' mode, use Snap Home.png as default
      if (config.homeScreenMode === 'graphic' || !config.homeScreenMode) {
        bgContainer.style.backgroundImage = `url("${defaultSnapHome}")`;
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const slider = document.getElementById('views-slider');
  if (!slider) {
    console.error('Views slider not found!');
    return;
  }

  // Active View track
  let currentActiveState: AppState = 'activation';
  const views: Record<AppState, BaseView> = {
    'activation': new ActivationView(document.getElementById('view-activation')!, navigateTo),
    'idle': new IdleView(document.getElementById('view-idle')!, navigateTo),
    'mode-selection': new ModeSelectionView(document.getElementById('view-mode-selection')!, navigateTo, session),
    'template-selection': new TemplateView(document.getElementById('view-template-selection')!, navigateTo, session),
    'package-selection': new PackageSelectionView(document.getElementById('view-package-selection')!, navigateTo, session),
    'order-summary': new OrderSummaryView(document.getElementById('view-order-summary')!, navigateTo, session),
    'camera-capture': new CaptureView(document.getElementById('view-camera-capture')!, navigateTo, session),
    'preview': new PreviewView(document.getElementById('view-preview')!, navigateTo, session),
    'printing': new PrintingView(document.getElementById('view-printing')!, navigateTo, session),
    'finished': new FinishedView(document.getElementById('view-finished')!, navigateTo, session)
  };

  // Mount all views initially
  Object.values(views).forEach(view => view.mount());

  // 3. Navigation State Machine
  function navigateTo(nextState: AppState, params?: any) {
    const config = loadKioskConfig();
    const isCurtainMode = config.homeScreenMode === 'curtain';

    // If returning to the welcome screen in curtain mode, close the curtains first
    if (nextState === 'idle' && currentActiveState !== 'idle' && isCurtainMode) {
      const globalCurtain = document.getElementById('global-curtain-container');
      if (globalCurtain) {
        // Show the global curtain and start it as open/parted
        globalCurtain.classList.remove('hidden');
        globalCurtain.classList.add('curtains-parted');
        const overlayPanel = globalCurtain.querySelector('#curtain-overlay-panel');
        if (overlayPanel) {
          (overlayPanel as HTMLElement).style.opacity = '0';
          overlayPanel.classList.remove('hidden');
        }

        // Force browser layout reflow to register the starting layout state
        void globalCurtain.offsetHeight;

        // Close the curtains smoothly
        globalCurtain.classList.remove('curtains-parted');
        if (overlayPanel) {
          setTimeout(() => {
            (overlayPanel as HTMLElement).style.opacity = '1';
          }, 200);
        }

        // Play the curtain close sound
        audioManager.playPaperTear();

        // Perform actual state transition behind the closed curtains after transition duration (1.2s)
        setTimeout(() => {
          performNavigation(nextState, params, true);
        }, 1200);
        return;
      }
    }

    // Otherwise, perform the navigation normally
    performNavigation(nextState, params, false);
  }

  function performNavigation(nextState: AppState, params?: any, forceInstant?: boolean) {
    const prevView = views[currentActiveState];
    const nextView = views[nextState];

    // Trigger leave lifecycle
    if (prevView.onLeave) {
      prevView.onLeave();
    }

    // Clean up session if returning to Welcome screen (idle)
    if (nextState === 'idle') {
      if (session.ditheredPhotos) {
        session.ditheredPhotos.forEach((url) => {
          if (url.startsWith('blob:')) {
            try { URL.revokeObjectURL(url); } catch (e) {}
          }
        });
      }
      if (session.metadata?.qrCodeUrl && session.metadata.qrCodeUrl.startsWith('blob:')) {
        try { URL.revokeObjectURL(session.metadata.qrCodeUrl); } catch (e) {}
      }
      session.selectedTemplateId = null;
      session.capturedPhotos = [];
      session.ditheredPhotos = [];
      session.metadata = null;
      session.isMirrored = false;
      session.copiesCount = 1;
      session.uploadPromise = undefined;
      session.bwBlob = undefined;
      session.colorBlob = undefined;
      session.shareId = undefined;
      session.selectedQuote = undefined;
    }

    // Slide viewport container to the active slide index
    const config = loadKioskConfig();
    const isCurtainMode = config.homeScreenMode === 'curtain';
    const isInstant = forceInstant || (isCurtainMode && (nextState === 'idle' || currentActiveState === 'idle'));

    if (isInstant) {
      slider!.classList.add('no-transition');
    } else {
      slider!.classList.remove('no-transition');
    }

    const slideIndex = stateIndexMap[nextState];
    slider!.style.transform = `translateX(-${slideIndex * 100}vw)`;

    // Update active visual panel markers
    Object.keys(stateIndexMap).forEach(state => {
      const el = document.getElementById(`view-${state}`);
      if (state === nextState) {
        el?.classList.add('active-slide');
      } else {
        el?.classList.remove('active-slide');
      }
    });

    // Update state tracker
    currentActiveState = nextState;

    // Trigger enter lifecycle
    if (nextView.onEnter) {
      nextView.onEnter(params);
    }

    // Reset inactivity timer on navigation
    resetInactivityTimer();
  }

  // 4. Global Kiosk Inactivity Reset
  // If the kiosk sits on any interactive page (non-idle) without touch for 60s, return to attract screen.
  let inactivityTimeoutId: number | null = null;
  const INACTIVITY_TIMEOUT = 60000; // 60 seconds

  function resetInactivityTimer() {
    if (inactivityTimeoutId !== null) {
      window.clearTimeout(inactivityTimeoutId);
      inactivityTimeoutId = null;
    }

    // We only time out if the screen is NOT already idle and NOT the activation screen
    if (currentActiveState !== 'idle' && currentActiveState !== 'activation') {
      inactivityTimeoutId = window.setTimeout(() => {
        console.warn('Kiosk inactive. Auto-returning to attracts loop...');
        navigateTo('idle');
      }, INACTIVITY_TIMEOUT);
    }
  }

  // Register touch/mouse actions to reset timer
  const interactionEvents = ['mousedown', 'mousemove', 'touchstart', 'keypress', 'scroll'];
  interactionEvents.forEach(eventName => {
    document.addEventListener(eventName, resetInactivityTimer, { passive: true });
  });

  // Expose theme application globally so the IdleView can re-trigger background loading on enter
  (window as any).applyKioskTheme = () => applyTheme(loadKioskConfig());

  // Load and apply configuration on startup
  (async () => {
    const initialConfig = loadKioskConfig();
    await applyTheme(initialConfig);
  })();

  // Setup Admin Modal controllers
  const adminModal = document.getElementById('admin-modal');
  const configForm = document.getElementById('admin-config-form') as HTMLFormElement;
  const logoFileInput = document.getElementById('input-logo-file') as HTMLInputElement;
  const curtainOverlayInput = document.getElementById('input-curtain-overlay-file') as HTMLInputElement;
  const bgFileInput = document.getElementById('input-bg-file') as HTMLInputElement;
  const closeBtn = document.getElementById('admin-close-x');
  const cancelBtn = document.getElementById('admin-cancel-btn');
  const resetBtn = document.getElementById('admin-reset-btn');
  const deactivateBtn = document.getElementById('admin-deactivate-btn');

  let currentLogoDataUrl: string | null = null;
  let currentCurtainOverlayDataUrl: string | null = null;
  let pendingBgFile: File | null = null;
  let bgFileType: 'image' | 'video' | null = null;
  let tempPackages: PrintPackage[] = [];

  function renderAdminPackagesTable(config: KioskConfig) {
    const tbody = document.getElementById('packages-editor-tbody');
    if (!tbody) return;

    if (tempPackages.length === 0 && config.packages) {
      tempPackages = JSON.parse(JSON.stringify(config.packages));
    }

    const currencyInput = document.getElementById('input-currency-symbol') as HTMLInputElement;
    const currency = currencyInput ? currencyInput.value.trim() || '₱' : (config.currencySymbol || '₱');

    tbody.innerHTML = tempPackages.map((pkg) => {
      const statusBadge = pkg.isEnabled 
        ? `<span class="status-badge online" style="cursor: pointer;" data-action="toggle" data-id="${pkg.id}">Enabled</span>`
        : `<span class="status-badge offline" style="cursor: pointer; background: #e03131;" data-action="toggle" data-id="${pkg.id}">Disabled</span>`;
        
      return `
        <tr style="border-bottom: 1px solid var(--border-primary);">
          <td style="padding: 10px; font-weight: 600;">${pkg.name}</td>
          <td style="padding: 10px; text-align: center;">${pkg.printsCount}</td>
          <td style="padding: 10px; text-align: right; font-family: monospace;">${currency}${pkg.price.toFixed(2)}</td>
          <td style="padding: 10px; text-align: center;">${statusBadge}</td>
          <td style="padding: 10px; text-align: center; display: flex; gap: 5px; justify-content: center;">
            <button type="button" class="btn-admin" data-action="edit" data-id="${pkg.id}" style="padding: 2px 6px; font-size: 10px; border-radius: 4px;">Edit</button>
            <button type="button" class="btn-admin" data-action="delete" data-id="${pkg.id}" style="padding: 2px 6px; font-size: 10px; border-radius: 4px; background: #e03131; color: white;">Delete</button>
          </td>
        </tr>
      `;
    }).join('');

    // Wire up events in the table
    tbody.querySelectorAll('[data-action]').forEach((el) => {
      const action = el.getAttribute('data-action');
      const id = el.getAttribute('data-id');
      if (!id) return;

      el.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (action === 'toggle') {
          const pkg = tempPackages.find(p => p.id === id);
          if (pkg) {
            pkg.isEnabled = !pkg.isEnabled;
            renderAdminPackagesTable(config);
          }
        } else if (action === 'edit') {
          const pkg = tempPackages.find(p => p.id === id);
          if (pkg) {
            const formTitle = document.getElementById('package-form-title');
            const editorId = document.getElementById('editor-package-id') as HTMLInputElement;
            const editorName = document.getElementById('editor-package-name') as HTMLInputElement;
            const editorPrints = document.getElementById('editor-package-prints') as HTMLInputElement;
            const editorPrice = document.getElementById('editor-package-price') as HTMLInputElement;
            const cancelBtn = document.getElementById('btn-package-cancel');
            const saveBtn = document.getElementById('btn-package-save');

            if (formTitle) formTitle.textContent = 'EDIT PRINT PACKAGE';
            if (editorId) editorId.value = pkg.id;
            if (editorName) editorName.value = pkg.name;
            if (editorPrints) editorPrints.value = pkg.printsCount.toString();
            if (editorPrice) editorPrice.value = pkg.price.toString();
            if (cancelBtn) cancelBtn.style.display = 'inline-block';
            if (saveBtn) saveBtn.textContent = 'Update Package';
          }
        } else if (action === 'delete') {
          if (confirm('Are you sure you want to delete this package?')) {
            tempPackages = tempPackages.filter(p => p.id !== id);
            renderAdminPackagesTable(config);
          }
        }
      });
    });
  }

  function updateLogoPreview(dataUrl: string | null) {
    const container = document.getElementById('preview-logo-container');
    if (!container) return;
    if (dataUrl) {
      container.innerHTML = `<img src="${dataUrl}" alt="Logo Preview" />`;
      container.classList.remove('hidden');
    } else {
      container.innerHTML = '';
      container.classList.add('hidden');
    }
  }

  function updateCurtainOverlayPreview(dataUrl: string | null) {
    const container = document.getElementById('preview-curtain-overlay-container');
    if (!container) return;
    if (dataUrl) {
      container.innerHTML = `<img src="${dataUrl}" alt="Overlay Preview" />`;
      container.classList.remove('hidden');
    } else {
      container.innerHTML = '';
      container.classList.add('hidden');
    }
  }

  function updateBgPreview(dataUrl: string | null, isVideo = false) {
    const container = document.getElementById('preview-bg-container');
    if (!container) return;
    if (dataUrl) {
      if (isVideo) {
        container.innerHTML = `<video src="${dataUrl}" style="max-height: 60px; max-width: 100%;" autoplay muted loop></video>`;
      } else {
        container.innerHTML = `<img src="${dataUrl}" alt="Background Preview" />`;
      }
      container.classList.remove('hidden');
    } else {
      container.innerHTML = '';
      container.classList.add('hidden');
    }
  }

  async function populateAdminForm(config: KioskConfig) {
    const nameInput = document.getElementById('input-cafe-name') as HTMLInputElement;
    const addressInput = document.getElementById('input-cafe-address') as HTMLInputElement;
    const phoneInput = document.getElementById('input-cafe-phone') as HTMLInputElement;
    const messageInput = document.getElementById('input-custom-message') as HTMLTextAreaElement;
    const socialTagInput = document.getElementById('input-social-tag') as HTMLInputElement;
    const bgColorInput = document.getElementById('input-bg-color') as HTMLInputElement;
    const textColorInput = document.getElementById('input-text-color') as HTMLInputElement;
    const textColorHomeInput = document.getElementById('input-text-home-color') as HTMLInputElement;
    const homeModeSelect = document.getElementById('input-home-mode') as HTMLSelectElement;
    const printContrastSelect = document.getElementById('input-print-contrast') as HTMLSelectElement;
    const printModeSelect = document.getElementById('input-print-mode') as HTMLSelectElement;
    const subtitleTopInput = document.getElementById('input-home-subtitle-top') as HTMLInputElement;
    const subtitleBottomInput = document.getElementById('input-home-subtitle-bottom') as HTMLInputElement;
    const adminPinInput = document.getElementById('input-admin-pin') as HTMLInputElement;
    const curtainColorInput = document.getElementById('input-curtain-color') as HTMLInputElement;
    const accentColorInput = document.getElementById('input-accent-color') as HTMLInputElement;
    
    if (nameInput) nameInput.value = config.cafeName;
    if (addressInput) addressInput.value = config.cafeAddress;
    if (phoneInput) phoneInput.value = config.cafePhone;
    if (messageInput) messageInput.value = config.customMessage;
    if (socialTagInput) socialTagInput.value = config.socialTag || 'beansandbites';
    if (bgColorInput) bgColorInput.value = config.backgroundColor;
    if (textColorInput) textColorInput.value = config.textColor;
    if (textColorHomeInput) textColorHomeInput.value = config.textColorHome || '#000000';
    if (homeModeSelect) homeModeSelect.value = config.homeScreenMode || 'graphic';
    if (printContrastSelect) printContrastSelect.value = config.printContrast || 'medium';
    if (printModeSelect) printModeSelect.value = config.printerMode || 'usb';
    if (subtitleTopInput) subtitleTopInput.value = config.homeSubtitleTop || '';
    if (subtitleBottomInput) subtitleBottomInput.value = config.homeSubtitleBottom || '';
    if (adminPinInput) adminPinInput.value = config.adminPin || '1234';
    if (curtainColorInput) curtainColorInput.value = config.curtainColor || '#111111';
    if (accentColorInput) accentColorInput.value = config.accentColor || '#007aff';

    const sessionPriceInput = document.getElementById('input-session-price') as HTMLInputElement;
    const profitShareInput = document.getElementById('input-profit-share') as HTMLInputElement;
    if (sessionPriceInput) sessionPriceInput.value = (config.sessionPrice !== undefined ? config.sessionPrice : 5.00).toFixed(2);
    if (profitShareInput) profitShareInput.value = (config.profitSharePercent !== undefined ? config.profitSharePercent : 60.00).toString();

    const enableQrInput = document.getElementById('input-enable-qr') as HTMLInputElement;
    if (enableQrInput) enableQrInput.checked = config.enableQrCode !== false;

    const enableFortuneInput = document.getElementById('input-enable-fortune') as HTMLInputElement;
    if (enableFortuneInput) enableFortuneInput.checked = config.enableMemoryFortune !== false;

    const enableComfortInput = document.getElementById('input-enable-comfort') as HTMLInputElement;
    if (enableComfortInput) enableComfortInput.checked = config.enableComfortCards !== false;

    const imgurClientIdInput = document.getElementById('input-imgur-client-id') as HTMLInputElement;
    if (imgurClientIdInput) imgurClientIdInput.value = config.imgurClientId || '';

    const imgbbApiKeyInput = document.getElementById('input-imgbb-api-key') as HTMLInputElement;
    if (imgbbApiKeyInput) imgbbApiKeyInput.value = config.imgbbApiKey || '';

    updateLogoPreview(config.logoDataUrl);
    updateCurtainOverlayPreview(config.curtainOverlayDataUrl || null);

    if (config.backgroundType) {
      const blob = await getBackgroundMedia();
      if (blob) {
        const url = URL.createObjectURL(blob);
        updateBgPreview(url, config.backgroundType === 'video');
        (window as any).bgPreviewUrl = url;
      } else {
        updateBgPreview(null);
      }
    } else {
      updateBgPreview(null);
    }

    // Populate print packages config
    const currencyInput = document.getElementById('input-currency-symbol') as HTMLInputElement;
    const maxPrintsInput = document.getElementById('input-max-prints') as HTMLInputElement;
    const welcomeMsgInput = document.getElementById('input-welcome-msg') as HTMLInputElement;

    if (currencyInput) currencyInput.value = config.currencySymbol || '₱';
    if (maxPrintsInput) maxPrintsInput.value = (config.maxPrintsAllowed || 4).toString();
    if (welcomeMsgInput) welcomeMsgInput.value = config.welcomeMessage || '';

    // Render print packages list
    tempPackages = config.packages ? JSON.parse(JSON.stringify(config.packages)) : [];
    renderAdminPackagesTable(config);
  }

  // Open modal handler
  adminModal?.addEventListener('open-admin', async () => {
    const config = loadKioskConfig();
    await populateAdminForm(config);
    currentLogoDataUrl = config.logoDataUrl;
    currentCurtainOverlayDataUrl = config.curtainOverlayDataUrl || null;
    pendingBgFile = null;
    bgFileType = config.backgroundType;

    // Refresh offline captures UI
    const offlineShares = await listOfflineShares();
    const countText = document.getElementById('offline-captures-count');
    const syncBtn = document.getElementById('admin-sync-btn') as HTMLButtonElement;
    if (countText && syncBtn) {
      countText.textContent = `${offlineShares.length} captures saved offline`;
      syncBtn.disabled = offlineShares.length === 0;
    }

    // Load statistics on modal open
    loadAdminStatistics();
  });

  // Bind statistics tab controls
  const statsTabBtn = document.querySelector('.admin-tab-btn[data-tab="statistics"]');
  statsTabBtn?.addEventListener('click', () => {
    loadAdminStatistics();
  });

  const refreshStatsBtn = document.getElementById('admin-refresh-stats-btn');
  refreshStatsBtn?.addEventListener('click', () => {
    loadAdminStatistics();
  });

  const forceSyncBtn = document.getElementById('admin-force-sync-btn');
  forceSyncBtn?.addEventListener('click', async () => {
    const forceSyncBtnEl = forceSyncBtn as HTMLButtonElement;
    forceSyncBtnEl.disabled = true;
    forceSyncBtnEl.textContent = 'Syncing...';
    try {
      const { successCount, failedCount } = await syncPendingSessions();
      alert(`Sync completed: ${successCount} sessions uploaded. Failed: ${failedCount}.`);
      await loadAdminStatistics();
    } catch (err) {
      console.error('[Force Sync Exception]', err);
      alert('Force sync operation failed.');
    } finally {
      forceSyncBtnEl.disabled = false;
      forceSyncBtnEl.textContent = 'Force Resync All';
    }
  });

  // Bind packages tab controls
  const packagesTabBtn = document.querySelector('.admin-tab-btn[data-tab="packages"]');
  packagesTabBtn?.addEventListener('click', () => {
    const config = loadKioskConfig();
    renderAdminPackagesTable(config);
  });

  const packageSaveBtn = document.getElementById('btn-package-save');
  const packageCancelBtn = document.getElementById('btn-package-cancel');
  
  packageSaveBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    const editorId = document.getElementById('editor-package-id') as HTMLInputElement;
    const editorName = document.getElementById('editor-package-name') as HTMLInputElement;
    const editorPrints = document.getElementById('editor-package-prints') as HTMLInputElement;
    const editorPrice = document.getElementById('editor-package-price') as HTMLInputElement;

    if (!editorName || !editorPrints || !editorPrice) return;

    const name = editorName.value.trim();
    const prints = parseInt(editorPrints.value);
    const price = parseFloat(editorPrice.value);

    if (!name || isNaN(prints) || isNaN(price)) {
      alert('Please fill out all package fields with valid values.');
      return;
    }

    const config = loadKioskConfig();

    if (editorId && editorId.value) {
      // Edit existing package
      const pkg = tempPackages.find(p => p.id === editorId.value);
      if (pkg) {
        pkg.name = name;
        pkg.printsCount = prints;
        pkg.price = price;
      }
    } else {
      // Add new package
      const newPkg = {
        id: 'pkg-' + Date.now(),
        name: name,
        printsCount: prints,
        price: price,
        isEnabled: true
      };
      tempPackages.push(newPkg);
    }

    // Reset Form
    resetPackageForm();
    renderAdminPackagesTable(config);
  });

  packageCancelBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    resetPackageForm();
  });

  function resetPackageForm() {
    const formTitle = document.getElementById('package-form-title');
    const editorId = document.getElementById('editor-package-id') as HTMLInputElement;
    const editorName = document.getElementById('editor-package-name') as HTMLInputElement;
    const editorPrints = document.getElementById('editor-package-prints') as HTMLInputElement;
    const editorPrice = document.getElementById('editor-package-price') as HTMLInputElement;
    const cancelBtn = document.getElementById('btn-package-cancel');
    const saveBtn = document.getElementById('btn-package-save');

    if (formTitle) formTitle.textContent = 'ADD NEW PACKAGE';
    if (editorId) editorId.value = '';
    if (editorName) editorName.value = '';
    if (editorPrints) editorPrints.value = '';
    if (editorPrice) editorPrice.value = '';
    if (cancelBtn) cancelBtn.style.display = 'none';
    if (saveBtn) saveBtn.textContent = 'Add Package';
  }

  async function loadAdminStatistics() {
    console.log('[Admin Stats] Loading statistics...');
    const localSessions = await listLocalSessions();
    const config = loadKioskConfig();
    const currency = config.currencySymbol || '₱';
    
    // Calculate stats
    const totalSessions = localSessions.length;
    const totalPrints = localSessions.reduce((sum, s) => sum + s.printsCount + s.additionalPrints, 0);
    const totalRevenue = localSessions.reduce((sum, s) => sum + s.totalAmount, 0);
    const pendingSync = localSessions.filter(s => s.syncStatus === 'pending').length;

    // Update Local Stats in UI
    const localSessionsEl = document.getElementById('stats-local-sessions');
    const localRevenueEl = document.getElementById('stats-local-revenue');
    const localPrintsEl = document.getElementById('stats-local-prints');
    const localPendingEl = document.getElementById('stats-local-pending');

    if (localSessionsEl) localSessionsEl.textContent = totalSessions.toString();
    if (localRevenueEl) localRevenueEl.textContent = `${currency}${totalRevenue.toFixed(2)}`;
    if (localPrintsEl) localPrintsEl.textContent = totalPrints.toString();
    if (localPendingEl) {
      localPendingEl.textContent = pendingSync.toString();
      if (pendingSync > 0) {
        localPendingEl.style.color = '#e69500'; // Warning gold
      } else {
        localPendingEl.style.color = '#2f9e44'; // Success green
      }
    }

    // Date breakdowns
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);

    const todaySessions = localSessions.filter(s => new Date(s.createdAt) >= startOfToday);
    const weekSessions = localSessions.filter(s => new Date(s.createdAt) >= startOfWeek);
    const monthSessions = localSessions.filter(s => new Date(s.createdAt) >= startOfMonth);

    const todayRev = todaySessions.reduce((sum, s) => sum + s.totalAmount, 0);
    const weekRev = weekSessions.reduce((sum, s) => sum + s.totalAmount, 0);
    const monthRev = monthSessions.reduce((sum, s) => sum + s.totalAmount, 0);

    const todayTxt = document.getElementById('stats-breakdown-today');
    const weekTxt = document.getElementById('stats-breakdown-week');
    const monthTxt = document.getElementById('stats-breakdown-month');

    if (todayTxt) todayTxt.textContent = `${todaySessions.length} sessions (${currency}${todayRev.toFixed(2)})`;
    if (weekTxt) weekTxt.textContent = `${weekSessions.length} sessions (${currency}${weekRev.toFixed(2)})`;
    if (monthTxt) monthTxt.textContent = `${monthSessions.length} sessions (${currency}${monthRev.toFixed(2)})`;

    // Reconciliation
    const reconLoading = document.getElementById('recon-loading');
    const reconData = document.getElementById('recon-data');
    if (reconLoading) {
      reconLoading.classList.remove('hidden');
      reconLoading.style.display = 'block';
    }
    if (reconData) reconData.classList.add('hidden');

    if (!navigator.onLine) {
      if (reconLoading) reconLoading.textContent = '🔌 Reconciliation unavailable offline';
      return;
    }

    if (reconLoading) reconLoading.textContent = '⏳ Loading cloud stats...';

    try {
      const deviceId = await getDeviceUUID();
      const { data: cloudData, error } = await supabase
        .from('sessions')
        .select('prints_count, additional_prints, total_amount')
        .eq('booth_id', deviceId);

      if (error) {
        throw error;
      }

      const cloudSessionsCount = cloudData ? cloudData.length : 0;
      const cloudPrintsCount = cloudData ? cloudData.reduce((sum, s) => sum + (s.prints_count || 0) + (s.additional_prints || 0), 0) : 0;
      const cloudRevenueVal = cloudData ? cloudData.reduce((sum, s) => sum + parseFloat(s.total_amount || 0), 0) : 0;

      // Render Reconciliation table values
      const devSessionsEl = document.getElementById('recon-device-sessions');
      const cloudSessionsEl = document.getElementById('recon-cloud-sessions');
      const statusSessionsEl = document.getElementById('recon-status-sessions');

      const devPrintsEl = document.getElementById('recon-device-prints');
      const cloudPrintsEl = document.getElementById('recon-cloud-prints');
      const statusPrintsEl = document.getElementById('recon-status-prints');

      const devRevEl = document.getElementById('recon-device-revenue');
      const cloudRevEl = document.getElementById('recon-cloud-revenue');
      const statusRevEl = document.getElementById('recon-status-revenue');

      if (devSessionsEl) devSessionsEl.textContent = totalSessions.toString();
      if (cloudSessionsEl) cloudSessionsEl.textContent = cloudSessionsCount.toString();
      if (statusSessionsEl) {
        if (totalSessions === cloudSessionsCount) {
          statusSessionsEl.innerHTML = '<span style="color: #2f9e44; font-weight: bold;">✅ Matched</span>';
        } else {
          statusSessionsEl.innerHTML = `<span style="color: #e69500; font-weight: bold;">⚠️ Diff: ${totalSessions - cloudSessionsCount}</span>`;
        }
      }

      if (devPrintsEl) devPrintsEl.textContent = totalPrints.toString();
      if (cloudPrintsEl) cloudPrintsEl.textContent = cloudPrintsCount.toString();
      if (statusPrintsEl) {
        if (totalPrints === cloudPrintsCount) {
          statusPrintsEl.innerHTML = '<span style="color: #2f9e44; font-weight: bold;">✅ Matched</span>';
        } else {
          statusPrintsEl.innerHTML = `<span style="color: #e69500; font-weight: bold;">⚠️ Diff: ${totalPrints - cloudPrintsCount}</span>`;
        }
      }

      if (devRevEl) devRevEl.textContent = `₱${totalRevenue.toFixed(2)}`;
      if (cloudRevEl) cloudRevEl.textContent = `₱${cloudRevenueVal.toFixed(2)}`;
      if (statusRevEl) {
        const revDiff = parseFloat((totalRevenue - cloudRevenueVal).toFixed(2));
        if (revDiff === 0) {
          statusRevEl.innerHTML = '<span style="color: #2f9e44; font-weight: bold;">✅ Matched</span>';
        } else {
          statusRevEl.innerHTML = `<span style="color: #e69500; font-weight: bold;">⚠️ Diff: ₱${revDiff.toFixed(2)}</span>`;
        }
      }

      if (reconLoading) {
        reconLoading.classList.add('hidden');
        reconLoading.style.display = 'none';
      }
      if (reconData) reconData.classList.remove('hidden');

    } catch (err) {
      console.error('[Reconciliation Error]', err);
      if (reconLoading) reconLoading.textContent = '❌ Failed to connect to cloud reconciliation';
    }

    // Render collection info
    let lastCollectedDate: Date | null = null;
    if (navigator.onLine) {
      try {
        const deviceId = await getDeviceUUID();
        const { data: b, error: bErr } = await supabase
          .from('booths')
          .select('last_collected_at')
          .eq('id', deviceId)
          .single();
        if (!bErr && b && b.last_collected_at) {
          lastCollectedDate = new Date(b.last_collected_at);
          localStorage.setItem('kiosk_last_collected_at', b.last_collected_at);
        }
      } catch (err) {
        console.warn('[Stats] Remote collection query failed:', err);
      }
    }

    if (!lastCollectedDate) {
      const cached = localStorage.getItem('kiosk_last_collected_at');
      if (cached) {
        lastCollectedDate = new Date(cached);
      }
    }

    // Filter sessions since last collection date
    const uncollectedSessions = localSessions.filter(s => !lastCollectedDate || new Date(s.createdAt) > lastCollectedDate);
    const uncollectedBalance = uncollectedSessions.reduce((sum, s) => sum + s.totalAmount, 0);

    const lastCollectedLabel = document.getElementById('kiosk-last-collected-label');
    const uncollectedBalanceEl = document.getElementById('kiosk-uncollected-balance');
    const confirmCollectedBtn = document.getElementById('admin-confirm-collected-btn') as HTMLButtonElement;

    if (lastCollectedLabel) {
      lastCollectedLabel.textContent = lastCollectedDate 
        ? lastCollectedDate.toLocaleString() 
        : 'Never Collected';
    }

    if (uncollectedBalanceEl) {
      uncollectedBalanceEl.textContent = `${currency}${uncollectedBalance.toFixed(2)}`;
    }

    if (confirmCollectedBtn) {
      confirmCollectedBtn.disabled = uncollectedBalance === 0;
      
      // Remove any existing listener by replacing the button clone
      const newBtn = confirmCollectedBtn.cloneNode(true) as HTMLButtonElement;
      confirmCollectedBtn.parentNode?.replaceChild(newBtn, confirmCollectedBtn);
      
      newBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (confirm(`Confirm audit & collection of cash payment of ${currency}${uncollectedBalance.toFixed(2)}?`)) {
          const nowStr = new Date().toISOString();
          localStorage.setItem('kiosk_last_collected_at', nowStr);
          
          if (navigator.onLine) {
            try {
              const deviceId = await getDeviceUUID();
              await supabase
                .from('booths')
                .update({ last_collected_at: nowStr, updated_at: nowStr })
                .eq('id', deviceId);
              await supabase
                .from('collections')
                .insert({
                  booth_id: deviceId,
                  collected_at: nowStr,
                  amount_collected: uncollectedBalance,
                  collector_name: 'Kiosk Operator'
                });
              alert('Collection payment successfully verified and synced with cloud console!');
            } catch (err) {
              console.error('Remote save failed:', err);
              localStorage.setItem('kiosk_pending_collection_amount', uncollectedBalance.toString());
              localStorage.setItem('kiosk_pending_collection_time', nowStr);
              alert('Collection logged locally (offline). It will sync automatically when internet resumes.');
            }
          } else {
            localStorage.setItem('kiosk_pending_collection_amount', uncollectedBalance.toString());
            localStorage.setItem('kiosk_pending_collection_time', nowStr);
            alert('Collection logged locally (offline). It will sync automatically when internet resumes.');
          }
          await loadAdminStatistics();
        }
      });
    }

    // Render Paper Roll info
    const paperMax = config.paperMaxPrints || 150;
    const paperRemaining = config.paperPrintsRemaining !== undefined ? config.paperPrintsRemaining : paperMax;
    const paperPercent = Math.min(100, Math.max(0, Math.round((paperRemaining / paperMax) * 100)));

    const paperRemainingLabel = document.getElementById('kiosk-paper-remaining-label');
    const paperBar = document.getElementById('kiosk-paper-bar');
    const refillPaperBtn = document.getElementById('admin-refill-paper-btn') as HTMLButtonElement;

    if (paperRemainingLabel) {
      paperRemainingLabel.textContent = `${paperRemaining} / ${paperMax} prints (${paperPercent}%)`;
      if (paperPercent <= 15) {
        paperRemainingLabel.style.color = '#c92a2a'; // critical red
      } else if (paperPercent <= 30) {
        paperRemainingLabel.style.color = '#e69500'; // warning gold
      } else {
        paperRemainingLabel.style.color = 'var(--text-secondary)';
      }
    }

    if (paperBar) {
      paperBar.style.width = `${paperPercent}%`;
      if (paperPercent <= 15) {
        paperBar.style.backgroundColor = '#c92a2a';
      } else if (paperPercent <= 30) {
        paperBar.style.backgroundColor = '#e69500';
      } else {
        paperBar.style.backgroundColor = '#1c7ed6';
      }
    }

    if (refillPaperBtn) {
      // Remove any existing listener by replacing clone
      const newRefillBtn = refillPaperBtn.cloneNode(true) as HTMLButtonElement;
      refillPaperBtn.parentNode?.replaceChild(newRefillBtn, refillPaperBtn);

      newRefillBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        if (confirm('Confirm refilling the printer paper roll? This will reset the prints counter to 150.')) {
          config.paperPrintsRemaining = paperMax;
          saveKioskConfig(config);

          if (navigator.onLine) {
            try {
              const deviceId = await getDeviceUUID();
              await supabase
                .from('booths')
                .update({ paper_prints_remaining: paperMax, updated_at: new Date().toISOString() })
                .eq('id', deviceId);
              alert('Paper roll refill successfully saved to cloud console!');
            } catch (err) {
              console.error('Remote paper update failed:', err);
              alert('Refilled locally (offline). Telemetry will update when internet is restored.');
            }
          } else {
            alert('Refilled locally (offline). Telemetry will update when internet is restored.');
          }
          await loadAdminStatistics();
        }
      });
    }
  }

  // Sync offline captures to Supabase
  const syncBtn = document.getElementById('admin-sync-btn');
  syncBtn?.addEventListener('click', async () => {
    const syncBtnEl = syncBtn as HTMLButtonElement;
    const countText = document.getElementById('offline-captures-count');
    if (!syncBtnEl || !countText) return;

    const shares = await listOfflineShares();
    if (shares.length === 0) return;

    syncBtnEl.disabled = true;
    syncBtnEl.textContent = 'Syncing...';

    let successCount = 0;
    for (const share of shares) {
      try {
        await uploadReceiptPhotos(share.bwBlob, share.colorBlob, share.id);
        await deleteOfflineShare(share.id);
        successCount++;
      } catch (err) {
        console.error(`Failed to sync offline capture ${share.id}:`, err);
      }
    }

    alert(`Successfully synced ${successCount} of ${shares.length} offline captures to cloud storage!`);
    
    // Refresh UI
    const updatedShares = await listOfflineShares();
    countText.textContent = `${updatedShares.length} captures saved offline`;
    syncBtnEl.disabled = updatedShares.length === 0;
    syncBtnEl.textContent = 'Sync Now';
  });

  // File readers
  logoFileInput?.addEventListener('change', () => {
    const file = logoFileInput.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        currentLogoDataUrl = result;
        updateLogoPreview(result);
      };
      reader.readAsDataURL(file);
    }
  });

  curtainOverlayInput?.addEventListener('change', () => {
    const file = curtainOverlayInput.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        currentCurtainOverlayDataUrl = result;
        updateCurtainOverlayPreview(result);
      };
      reader.readAsDataURL(file);
    }
  });

  bgFileInput?.addEventListener('change', () => {
    const file = bgFileInput.files?.[0];
    if (file) {
      pendingBgFile = file;
      bgFileType = file.type.startsWith('video/') ? 'video' : 'image';
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        updateBgPreview(result, bgFileType === 'video');
      };
      reader.readAsDataURL(file);
    }
  });

  const closeModal = () => {
    adminModal?.classList.add('hidden');
    if (logoFileInput) logoFileInput.value = '';
    if (curtainOverlayInput) curtainOverlayInput.value = '';
    if (bgFileInput) bgFileInput.value = '';
    pendingBgFile = null;
    bgFileType = null;
    if ((window as any).bgPreviewUrl) {
      URL.revokeObjectURL((window as any).bgPreviewUrl);
      (window as any).bgPreviewUrl = null;
    }
  };

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  // Form submission
  configForm?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById('input-cafe-name') as HTMLInputElement;
    const addressInput = document.getElementById('input-cafe-address') as HTMLInputElement;
    const phoneInput = document.getElementById('input-cafe-phone') as HTMLInputElement;
    const messageInput = document.getElementById('input-custom-message') as HTMLTextAreaElement;
    const socialTagInput = document.getElementById('input-social-tag') as HTMLInputElement;
    const imgurClientIdInput = document.getElementById('input-imgur-client-id') as HTMLInputElement;
    const imgbbApiKeyInput = document.getElementById('input-imgbb-api-key') as HTMLInputElement;
    const bgColorInput = document.getElementById('input-bg-color') as HTMLInputElement;
    const textColorInput = document.getElementById('input-text-color') as HTMLInputElement;
    const textColorHomeInput = document.getElementById('input-text-home-color') as HTMLInputElement;
    const homeModeSelect = document.getElementById('input-home-mode') as HTMLSelectElement;
    const printContrastSelect = document.getElementById('input-print-contrast') as HTMLSelectElement;
    const printModeSelect = document.getElementById('input-print-mode') as HTMLSelectElement;
    const enableQrInput = document.getElementById('input-enable-qr') as HTMLInputElement;
    const enableFortuneInput = document.getElementById('input-enable-fortune') as HTMLInputElement;
    const enableComfortInput = document.getElementById('input-enable-comfort') as HTMLInputElement;
    const subtitleTopInput = document.getElementById('input-home-subtitle-top') as HTMLInputElement;
    const subtitleBottomInput = document.getElementById('input-home-subtitle-bottom') as HTMLInputElement;
    const adminPinInput = document.getElementById('input-admin-pin') as HTMLInputElement;
    const curtainColorInput = document.getElementById('input-curtain-color') as HTMLInputElement;
    const accentColorInput = document.getElementById('input-accent-color') as HTMLInputElement;

    // Handle background media save
    let resolvedBgType: 'image' | 'video' | null = bgFileType;
    if (pendingBgFile) {
      try {
        await saveBackgroundMedia(pendingBgFile);
      } catch (err) {
        console.error('Failed to save background media to IndexedDB:', err);
      }
    }

    const sessionPriceInput = document.getElementById('input-session-price') as HTMLInputElement;
    const profitShareInput = document.getElementById('input-profit-share') as HTMLInputElement;

    const newConfig: KioskConfig = {
      cafeName: nameInput.value.trim().toUpperCase(),
      cafeAddress: addressInput.value.trim().toUpperCase(),
      cafePhone: phoneInput.value.trim().toUpperCase(),
      customMessage: messageInput.value.trim(),
      socialTag: socialTagInput ? socialTagInput.value.trim() : 'beansandbites',
      backgroundColor: bgColorInput.value,
      textColor: textColorInput.value,
      textColorHome: textColorHomeInput.value,
      logoDataUrl: currentLogoDataUrl,
      backgroundType: resolvedBgType,
      imgurClientId: imgurClientIdInput ? imgurClientIdInput.value.trim() : '',
      imgbbApiKey: imgbbApiKeyInput ? imgbbApiKeyInput.value.trim() : '',
      homeScreenMode: homeModeSelect ? (homeModeSelect.value as 'graphic' | 'layout' | 'curtain') : 'graphic',
      curtainOverlayDataUrl: currentCurtainOverlayDataUrl,
      curtainColor: curtainColorInput ? curtainColorInput.value : '#111111',
      accentColor: accentColorInput ? accentColorInput.value : '#007aff',
      enableQrCode: enableQrInput ? enableQrInput.checked : true,
      enableMemoryFortune: enableFortuneInput ? enableFortuneInput.checked : true,
      enableComfortCards: enableComfortInput ? enableComfortInput.checked : true,
      printContrast: printContrastSelect ? (printContrastSelect.value as 'light' | 'medium' | 'dark' | 'deep') : 'medium',
      printerMode: printModeSelect ? (printModeSelect.value as 'usb' | 'bluetooth') : 'usb',
      homeSubtitleTop: subtitleTopInput ? subtitleTopInput.value.trim() : '',
      homeSubtitleBottom: subtitleBottomInput ? subtitleBottomInput.value.trim() : '',
      adminPin: adminPinInput ? adminPinInput.value.trim() : '1234',
      sessionPrice: sessionPriceInput ? parseFloat(sessionPriceInput.value) : 5.00,
      profitSharePercent: profitShareInput ? parseFloat(profitShareInput.value) : 60.00,
      packages: tempPackages,
      maxPrintsAllowed: document.getElementById('input-max-prints') ? parseInt((document.getElementById('input-max-prints') as HTMLInputElement).value) : 4,
      currencySymbol: document.getElementById('input-currency-symbol') ? (document.getElementById('input-currency-symbol') as HTMLInputElement).value.trim() : '₱',
      welcomeMessage: document.getElementById('input-welcome-msg') ? (document.getElementById('input-welcome-msg') as HTMLInputElement).value.trim() : ''
    };

    saveKioskConfig(newConfig);
    
    // Trigger telemetry update to push name and pricing configuration changes online immediately
    const deviceId = await getDeviceUUID();
    await updateBoothTelemetry(deviceId).catch(err => console.error('[Config] Telemetry update failed:', err));

    await applyTheme(newConfig);
    
    const idleView = views['idle'] as IdleView;
    if (idleView && typeof idleView.updateBranding === 'function') {
      idleView.updateBranding();
    }

    closeModal();
  });

  // Reset to default
  resetBtn?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all customizations to default?')) {
      resetKioskConfig();
      await deleteBackgroundMedia();
      
      const config = loadKioskConfig();
      await applyTheme(config);
      await populateAdminForm(config);
      currentLogoDataUrl = config.logoDataUrl;
      currentCurtainOverlayDataUrl = config.curtainOverlayDataUrl || null;
      pendingBgFile = null;
      bgFileType = null;

      const idleView = views['idle'] as IdleView;
      if (idleView && typeof idleView.updateBranding === 'function') {
        idleView.updateBranding();
      }

      closeModal();
    }
  });

  // Deactivate license key
  deactivateBtn?.addEventListener('click', async () => {
    if (confirm('Are you sure you want to deactivate this device? This will clear the activation key and lock the app.')) {
      await deactivateLicense();
      closeModal();
      navigateTo('activation');
    }
  });

  // 5. Initialize Kiosk with Activation Check
  (async () => {
    const isActivated = await checkLicenseOnStartup();
    if (isActivated) {
      navigateTo('idle');
    } else {
      navigateTo('activation');
    }
  })();

  window.addEventListener('kiosk-config-updated', () => {
    console.log('[Main] Kiosk config updated remotely. Reloading stats.');
    loadAdminStatistics();
  });

  resetInactivityTimer();
});
}

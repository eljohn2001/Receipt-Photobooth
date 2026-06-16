import './style.css';
import type { AppSession, AppState } from './types';
import { IdleView } from './views/idle';
import { TemplateView } from './views/template';
import { CaptureView } from './views/capture';
import { PreviewView } from './views/preview';
import { PrintingView } from './views/printing';
import { FinishedView } from './views/finished';
import { BaseView } from './views/base';
import { loadKioskConfig, saveKioskConfig, resetKioskConfig, type KioskConfig } from './services/config';

import { getBackgroundMedia, saveBackgroundMedia, deleteBackgroundMedia } from './services/db';

function renderDownloadPage(photoUrl: string) {
  document.body.innerHTML = `
    <div class="download-page-container">
      <div class="download-page-card">
        <div class="download-page-header">
          <h1 class="download-title">YOUR MEMORY</h1>
          <p class="download-subtitle">Beans & Bites Photo Booth</p>
        </div>
        
        <div class="download-image-wrapper">
          <img class="download-receipt-image" src="${photoUrl}" alt="Photo Receipt" />
        </div>
        
        <div class="download-instructions">
          <p class="instruction-main">Tap and hold (long press) the image above to save it to your Photos/Gallery.</p>
          <p class="instruction-sub">Or click the button below to download directly:</p>
        </div>
        
        <a href="${photoUrl}" download="receipt-photo.png" class="btn-download-action">
          💾 DOWNLOAD PHOTO
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
}

// 1. Check for hybrid download page parameter on startup
const urlParams = new URLSearchParams(window.location.search);
const photoUrl = urlParams.get('photo');
if (photoUrl) {
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
  'idle': 0,
  'template-selection': 1,
  'camera-capture': 2,
  'preview': 3,
  'printing': 4,
  'finished': 5
};

let activeBgObjectUrl: string | null = null;

// Global theme application helper
async function applyTheme(config: KioskConfig) {
  const root = document.documentElement;
  root.style.setProperty('--bg-primary', config.backgroundColor);
  root.style.setProperty('--bg-secondary', config.backgroundColor);
  root.style.setProperty('--text-primary', config.textColor);
  root.style.setProperty('--accent-color', config.textColor);
  root.style.setProperty('--accent-secondary', config.textColor);

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

    if (config.backgroundType) {
      const blob = await getBackgroundMedia();
      if (blob) {
        activeBgObjectUrl = URL.createObjectURL(blob);
        if (config.backgroundType === 'image') {
          bgContainer.style.backgroundImage = `url(${activeBgObjectUrl})`;
        } else if (config.backgroundType === 'video') {
          bgContainer.innerHTML = `
            <video class="idle-background-video" src="${activeBgObjectUrl}" autoplay loop muted playsinline></video>
          `;
        }
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
  let currentActiveState: AppState = 'idle';
  const views: Record<AppState, BaseView> = {
    'idle': new IdleView(document.getElementById('view-idle')!, navigateTo),
    'template-selection': new TemplateView(document.getElementById('view-template-selection')!, navigateTo, session),
    'camera-capture': new CaptureView(document.getElementById('view-camera-capture')!, navigateTo, session),
    'preview': new PreviewView(document.getElementById('view-preview')!, navigateTo, session),
    'printing': new PrintingView(document.getElementById('view-printing')!, navigateTo, session),
    'finished': new FinishedView(document.getElementById('view-finished')!, navigateTo, session)
  };

  // Mount all views initially
  Object.values(views).forEach(view => view.mount());

  // 3. Navigation State Machine
  function navigateTo(nextState: AppState, params?: any) {
    const prevView = views[currentActiveState];
    const nextView = views[nextState];

    // Trigger leave lifecycle
    if (prevView.onLeave) {
      prevView.onLeave();
    }

    // Slide viewport container to the active slide index
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

    // We only time out if the screen is NOT already idle
    if (currentActiveState !== 'idle') {
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
  const bgFileInput = document.getElementById('input-bg-file') as HTMLInputElement;
  const closeBtn = document.getElementById('admin-close-x');
  const cancelBtn = document.getElementById('admin-cancel-btn');
  const resetBtn = document.getElementById('admin-reset-btn');

  let currentLogoDataUrl: string | null = null;
  let pendingBgFile: File | null = null;
  let bgFileType: 'image' | 'video' | null = null;

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
    const bgColorInput = document.getElementById('input-bg-color') as HTMLInputElement;
    const textColorInput = document.getElementById('input-text-color') as HTMLInputElement;
    const textColorHomeInput = document.getElementById('input-text-home-color') as HTMLInputElement;
    
    if (nameInput) nameInput.value = config.cafeName;
    if (addressInput) addressInput.value = config.cafeAddress;
    if (phoneInput) phoneInput.value = config.cafePhone;
    if (messageInput) messageInput.value = config.customMessage;
    if (bgColorInput) bgColorInput.value = config.backgroundColor;
    if (textColorInput) textColorInput.value = config.textColor;
    if (textColorHomeInput) textColorHomeInput.value = config.textColorHome || '#000000';

    updateLogoPreview(config.logoDataUrl);

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
  }

  // Open modal handler
  adminModal?.addEventListener('open-admin', async () => {
    const config = loadKioskConfig();
    await populateAdminForm(config);
    currentLogoDataUrl = config.logoDataUrl;
    pendingBgFile = null;
    bgFileType = config.backgroundType;
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
    const bgColorInput = document.getElementById('input-bg-color') as HTMLInputElement;
    const textColorInput = document.getElementById('input-text-color') as HTMLInputElement;
    const textColorHomeInput = document.getElementById('input-text-home-color') as HTMLInputElement;

    // Handle background media save
    let resolvedBgType: 'image' | 'video' | null = bgFileType;
    if (pendingBgFile) {
      try {
        await saveBackgroundMedia(pendingBgFile);
      } catch (err) {
        console.error('Failed to save background media to IndexedDB:', err);
      }
    }

    const newConfig: KioskConfig = {
      cafeName: nameInput.value.trim().toUpperCase(),
      cafeAddress: addressInput.value.trim().toUpperCase(),
      cafePhone: phoneInput.value.trim().toUpperCase(),
      customMessage: messageInput.value.trim(),
      backgroundColor: bgColorInput.value,
      textColor: textColorInput.value,
      textColorHome: textColorHomeInput.value,
      logoDataUrl: currentLogoDataUrl,
      backgroundType: resolvedBgType
    };

    saveKioskConfig(newConfig);
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
      pendingBgFile = null;
      bgFileType = null;

      const idleView = views['idle'] as IdleView;
      if (idleView && typeof idleView.updateBranding === 'function') {
        idleView.updateBranding();
      }

      closeModal();
    }
  });

  // 5. Initialize the Attract Screen
  (async () => {
    await views['idle'].onEnter?.();
  })();
  resetInactivityTimer();
});
}

import { BaseView } from './base';
import { getTemplateById } from '../templates';
import type { AppSession } from '../types';
import { audioManager } from '../services/audio';

interface PlacedSticker {
  id: string;
  emoji: string;
  x: number; // in pixels relative to workspace
  y: number; // in pixels relative to workspace
  scale: number;
  rotation: number; // in degrees
}

const STICKERS = [
  { emoji: '🕶', label: 'Glasses' },
  { emoji: '🎀', label: 'Bow' },
  { emoji: '👑', label: 'Crown' },
  { emoji: '🎩', label: 'Hat' },
  { emoji: '🥳', label: 'Party' },
  { emoji: '🎉', label: 'Popper' },
  { emoji: '❤️', label: 'Heart' },
  { emoji: '⭐', label: 'Star' },
  { emoji: '✨', label: 'Sparkles' },
  { emoji: '🐱', label: 'Cat' },
  { emoji: '🐶', label: 'Dog' },
  { emoji: '🌈', label: 'Rainbow' },
  { emoji: '☕', label: 'Coffee' },
  { emoji: '🥐', label: 'Croissant' },
  { emoji: '🍪', label: 'Cookie' },
  { emoji: '🍩', label: 'Donut' },
  { emoji: '📸', label: 'Camera' }
];

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
}

export class StickersView extends BaseView {
  private activeSession: AppSession;
  private originalPhotosBackup: string[] = [];
  private activePhotoIndex: number = 0;
  private photoStickers: Record<number, PlacedSticker[]> = {};

  constructor(
    element: HTMLElement,
    navigateTo: (state: any, params?: any) => void,
    session: AppSession
  ) {
    super(element, navigateTo);
    this.activeSession = session;
  }

  mount(): void {
    // Dom populated dynamically in onEnter
  }

  unmount(): void {}

  onEnter(): void {
    const template = getTemplateById(this.activeSession.selectedTemplateId || '');
    if (!template || this.activeSession.capturedPhotos.length === 0) {
      console.error('Invalid stickers state: missing template or photos');
      this.navigateTo('template-selection');
      return;
    }

    // Initialize/reset backups
    this.originalPhotosBackup = [...this.activeSession.capturedPhotos];
    this.activePhotoIndex = 0;
    this.photoStickers = {}; // start fresh

    this.renderView();
  }

  private renderView(): void {
    const template = getTemplateById(this.activeSession.selectedTemplateId || '');
    if (!template) return;

    const totalPhotos = template.photoCount;
    const activePhotoSrc = this.originalPhotosBackup[this.activePhotoIndex];

    // Responsive aspect ratio matching workspace container width of 340px
    const workspaceWidth = 340;
    const workspaceHeight = workspaceWidth / template.aspectRatio;

    this.element.innerHTML = `
      <div class="stickers-screen-content">
        <div class="template-screen-header">
          <button class="btn-back" id="btn-stickers-back">← BACK</button>
          <h2 class="template-choose-title" style="justify-content: center;">DECORATE <span class="script-title">Photos</span></h2>
          <p class="view-subtitle" style="margin-top: 6px;">Tap stickers to add, drag to move, pinch/drag handles to scale & rotate!</p>
        </div>

        <div class="stickers-vertical-layout">
          <!-- Dark Preview-like container wrapper -->
          <div class="stickers-layout-container">
            <div class="stickers-paper-scroll-wrapper">
              <div class="thermal-paper" style="max-width: 440px; padding: 25px 15px; margin: 0 auto; box-sizing: border-box; position: relative;">
                <div class="receipt-footer-tear"></div>
                
                <!-- Receipt Header Mock -->
                <div style="text-align: center; margin-bottom: 20px; font-family: var(--font-receipt); color: #000000; user-select: none;">
                  <div style="font-weight: bold; font-size: 16px; letter-spacing: 1px;">DECORATE STEP</div>
                  <div style="font-size: 9px; opacity: 0.8; margin-top: 3px; letter-spacing: 0.5px;">CUSTOMIZE YOUR KEEPSAKE</div>
                  <div style="border-top: 1.5px dashed #222222; margin: 15px 10px 0 10px;"></div>
                </div>

                <!-- Centered Workspace -->
                <div class="sticker-workspace-wrapper" style="box-shadow: none; border: none; padding: 0; background: transparent; display: flex; justify-content: center; margin-bottom: 0;">
                  <div class="sticker-workspace" id="sticker-workspace" style="width: ${workspaceWidth}px; height: ${workspaceHeight}px; border: 1.5px solid #000000; box-shadow: 0 4px 10px rgba(0,0,0,0.05); position: relative; overflow: hidden; background: #000000; border-radius: 6px;">
                    <img src="${activePhotoSrc}" class="workspace-bg-image" />
                    <div id="placed-stickers-layer" style="width: 100%; height: 100%; position: absolute; top: 0; left: 0; pointer-events: none;"></div>
                  </div>
                </div>

                <!-- Receipt Footer Mock -->
                <div style="text-align: center; margin-top: 20px; font-family: var(--font-receipt); color: #000000; user-select: none;">
                  <div style="border-top: 1.5px dashed #222222; margin: 0 10px 15px 10px;"></div>
                  <div style="font-size: 10px; font-weight: bold; letter-spacing: 1px;">PHOTO ${this.activePhotoIndex + 1} OF ${totalPhotos}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- Switch Photo Thumbnail Bar (if multiple photos exist) -->
          ${totalPhotos > 1 ? `
            <div class="stickers-photo-selector">
              ${this.originalPhotosBackup.map((photo, i) => `
                <div class="sticker-photo-thumb ${i === this.activePhotoIndex ? 'active' : ''}" data-index="${i}">
                  <img src="${photo}" />
                  <span class="thumb-badge">${i + 1}</span>
                </div>
              `).join('')}
            </div>
          ` : ''}

          <!-- Horizontal Stickers Carousel below the photo -->
          <div class="stickers-carousel-container">
            <div class="stickers-carousel-track">
              ${STICKERS.map(s => `
                <button class="btn-carousel-sticker" data-emoji="${s.emoji}">
                  <span class="emoji-preview">${s.emoji}</span>
                </button>
              `).join('')}
            </div>
          </div>

          <div class="stickers-actions-footer">
            <button class="btn btn-secondary" id="btn-stickers-clear">🗑 CLEAR ALL</button>
            <button class="btn btn-primary btn-glow" id="btn-stickers-proceed">PROCEED TO PRINT ➔</button>
          </div>
        </div>
      </div>
    `;

    this.renderPlacedStickers();
    this.setupEvents();
  }

  private renderPlacedStickers(): void {
    const layer = this.element.querySelector('#placed-stickers-layer');
    if (!layer) return;

    layer.innerHTML = '';

    const list = this.photoStickers[this.activePhotoIndex] || [];
    list.forEach(sticker => {
      const stickerDiv = document.createElement('div');
      stickerDiv.className = 'placed-sticker';
      stickerDiv.setAttribute('data-id', sticker.id);
      
      // Inline styles for absolute positioning and transforms
      stickerDiv.style.position = 'absolute';
      stickerDiv.style.pointerEvents = 'auto';
      stickerDiv.style.left = `${sticker.x}px`;
      stickerDiv.style.top = `${sticker.y}px`;
      stickerDiv.style.transform = `scale(${sticker.scale}) rotate(${sticker.rotation}deg)`;
      stickerDiv.style.cursor = 'move';
      stickerDiv.style.width = '64px';
      stickerDiv.style.height = '64px';
      stickerDiv.style.display = 'flex';
      stickerDiv.style.alignItems = 'center';
      stickerDiv.style.justifyContent = 'center';

      stickerDiv.innerHTML = `
        <span class="sticker-emoji" style="font-size: 40px; user-select: none; pointer-events: none;">${sticker.emoji}</span>
        <div class="sticker-control delete-btn" style="position: absolute; top: -8px; right: -8px; width: 20px; height: 20px; border-radius: 50%; background: var(--accent-danger); color: #ffffff; font-size: 14px; display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: pointer; border: 1.5px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">×</div>
        <div class="sticker-control resize-btn" style="position: absolute; bottom: -8px; right: -8px; width: 20px; height: 20px; border-radius: 50%; background: var(--accent-primary); color: #ffffff; font-size: 11px; display: flex; align-items: center; justify-content: center; font-weight: bold; cursor: nwse-resize; border: 1.5px solid #ffffff; box-shadow: 0 2px 4px rgba(0,0,0,0.15);">⤗</div>
      `;

      layer.appendChild(stickerDiv);
    });

    this.setupStickerInteraction();
  }

  private setupStickerInteraction(): void {
    const workspaceEl = this.element.querySelector('#sticker-workspace') as HTMLElement;
    if (!workspaceEl) return;

    let activeDragStickerId: string | null = null;
    let activeResizeStickerId: string | null = null;

    let startMouseX = 0;
    let startMouseY = 0;
    let startStickerX = 0;
    let startStickerY = 0;

    let centerX = 0;
    let centerY = 0;
    let startDistance = 0;
    let startAngle = 0;
    let startScale = 1.0;
    let startRotation = 0;

    const getCoords = (e: any) => {
      if (e.touches && e.touches.length > 0) {
        return { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
      return { x: e.clientX, y: e.clientY };
    };

    const placedDivs = this.element.querySelectorAll('.placed-sticker');
    placedDivs.forEach(el => {
      const id = el.getAttribute('data-id') || '';
      const list = this.photoStickers[this.activePhotoIndex] || [];
      const sticker = list.find(s => s.id === id);
      if (!sticker) return;

      // 1. Dragging handles
      el.addEventListener('mousedown', ((e: any) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('sticker-control')) return;
        const coords = getCoords(e);
        activeDragStickerId = id;
        startMouseX = coords.x;
        startMouseY = coords.y;
        startStickerX = sticker.x;
        startStickerY = sticker.y;
      }) as EventListener);

      el.addEventListener('touchstart', ((e: any) => {
        const target = e.target as HTMLElement;
        if (target.classList.contains('sticker-control')) return;
        const coords = getCoords(e);
        activeDragStickerId = id;
        startMouseX = coords.x;
        startMouseY = coords.y;
        startStickerX = sticker.x;
        startStickerY = sticker.y;
      }) as EventListener, { passive: true });

      // 2. Deleting button
      const deleteBtn = el.querySelector('.delete-btn');
      deleteBtn?.addEventListener('click', ((e: any) => {
        e.stopPropagation();
        audioManager.playBeep();
        this.photoStickers[this.activePhotoIndex] = list.filter(s => s.id !== id);
        this.renderPlacedStickers();
      }) as EventListener);

      deleteBtn?.addEventListener('touchstart', ((e: any) => {
        e.stopPropagation();
        audioManager.playBeep();
        this.photoStickers[this.activePhotoIndex] = list.filter(s => s.id !== id);
        this.renderPlacedStickers();
      }) as EventListener);

      // 3. Resizing / Rotating handle
      const resizeBtn = el.querySelector('.resize-btn');
      const startResizeHandler = (e: any) => {
        e.stopPropagation();
        const coords = getCoords(e);
        activeResizeStickerId = id;

        const rect = workspaceEl.getBoundingClientRect();
        centerX = rect.left + sticker.x + 32; // Sticker size is 64x64px, center is 32px
        centerY = rect.top + sticker.y + 32;

        startDistance = Math.hypot(coords.x - centerX, coords.y - centerY);
        startAngle = Math.atan2(coords.y - centerY, coords.x - centerX);
        startScale = sticker.scale;
        startRotation = sticker.rotation;
      };

      resizeBtn?.addEventListener('mousedown', startResizeHandler as EventListener);
      resizeBtn?.addEventListener('touchstart', startResizeHandler as EventListener, { passive: true });
    });

    // 4. Move and End listeners at window level to handle drags leaving workspace boundary
    const onMove = (e: any) => {
      if (activeDragStickerId) {
        const coords = getCoords(e);
        const dx = coords.x - startMouseX;
        const dy = coords.y - startMouseY;

        const list = this.photoStickers[this.activePhotoIndex] || [];
        const sticker = list.find(s => s.id === activeDragStickerId);
        if (sticker) {
          sticker.x = startStickerX + dx;
          sticker.y = startStickerY + dy;

          const el = this.element.querySelector(`.placed-sticker[data-id="${sticker.id}"]`) as HTMLElement;
          if (el) {
            el.style.left = `${sticker.x}px`;
            el.style.top = `${sticker.y}px`;
          }
        }
      } else if (activeResizeStickerId) {
        const coords = getCoords(e);
        const currentDistance = Math.hypot(coords.x - centerX, coords.y - centerY);
        const currentAngle = Math.atan2(coords.y - centerY, coords.x - centerX);

        const list = this.photoStickers[this.activePhotoIndex] || [];
        const sticker = list.find(s => s.id === activeResizeStickerId);
        if (sticker) {
          sticker.scale = startScale * (currentDistance / startDistance);
          if (sticker.scale < 0.4) sticker.scale = 0.4;
          if (sticker.scale > 4.0) sticker.scale = 4.0;

          const angleDiff = (currentAngle - startAngle) * 180 / Math.PI;
          sticker.rotation = startRotation + angleDiff;

          const el = this.element.querySelector(`.placed-sticker[data-id="${sticker.id}"]`) as HTMLElement;
          if (el) {
            el.style.transform = `scale(${sticker.scale}) rotate(${sticker.rotation}deg)`;
          }
        }
      }
    };

    const onEnd = () => {
      activeDragStickerId = null;
      activeResizeStickerId = null;
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchend', onEnd);

    // Clean up global window events when drawing layers are redrawn or unmounted
    const cleanupInteractions = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchend', onEnd);
    };

    // Override renderPlacedStickers calling stack to detach window listeners
    const originalRender = this.renderPlacedStickers.bind(this);
    this.renderPlacedStickers = () => {
      cleanupInteractions();
      originalRender();
    };
  }

  private setupEvents(): void {
    // 1. Back Button
    const backBtn = this.element.querySelector('#btn-stickers-back');
    backBtn?.addEventListener('click', () => {
      audioManager.playBeep();
      this.navigateTo('review');
    });

    // 2. Select Photo Thumbnail Click
    const thumbnails = this.element.querySelectorAll('.sticker-photo-thumb');
    thumbnails.forEach(thumb => {
      thumb.addEventListener('click', (e) => {
        const indexStr = (e.currentTarget as HTMLElement).getAttribute('data-index');
        if (indexStr === null) return;
        const index = parseInt(indexStr, 10);
        
        if (index === this.activePhotoIndex) return;
        audioManager.playBeep();
        this.activePhotoIndex = index;
        this.renderView();
      });
    });

    // 3. Sticker Carousel Buttons Click
    const drawerStickers = this.element.querySelectorAll('.btn-carousel-sticker');
    drawerStickers.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const emoji = (e.currentTarget as HTMLElement).getAttribute('data-emoji') || '✨';
        audioManager.playBeep();

        const workspaceEl = this.element.querySelector('#sticker-workspace') as HTMLElement;
        const workspaceW = 340;
        const workspaceH = workspaceEl ? workspaceEl.offsetHeight : 340;

        // Position placed sticker in the middle initially (sticker size is 64x64, center is (w/2 - 32))
        const newSticker: PlacedSticker = {
          id: `${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          emoji,
          x: Math.floor(workspaceW / 2 - 32),
          y: Math.floor(workspaceH / 2 - 32),
          scale: 1.0,
          rotation: 0
        };

        if (!this.photoStickers[this.activePhotoIndex]) {
          this.photoStickers[this.activePhotoIndex] = [];
        }
        this.photoStickers[this.activePhotoIndex].push(newSticker);
        this.renderPlacedStickers();
      });
    });

    // 4. Clear Stickers Button
    const clearBtn = this.element.querySelector('#btn-stickers-clear');
    clearBtn?.addEventListener('click', () => {
      audioManager.playBeep();
      this.photoStickers[this.activePhotoIndex] = [];
      this.renderPlacedStickers();
    });

    // 5. Proceed to Print Button
    const proceedBtn = this.element.querySelector('#btn-stickers-proceed');
    proceedBtn?.addEventListener('click', async () => {
      audioManager.playBeep();
      
      const loader = document.createElement('div');
      loader.className = 'stickers-bake-loader';
      loader.innerHTML = `
        <div class="loader-spinner"></div>
        <div style="margin-top: 12px; font-weight: bold; letter-spacing: 0.5px; font-size: 14px;">Baking stickers onto photos...</div>
      `;
      this.element.appendChild(loader);

      try {
        await this.bakeStickersToSessionPhotos();
        this.navigateTo('preview');
      } catch (err) {
        console.error('Failed to bake stickers:', err);
        alert('Could not apply stickers. Please try again.');
        loader.remove();
      }
    });
  }

  private async bakeStickersToSessionPhotos(): Promise<void> {
    const template = getTemplateById(this.activeSession.selectedTemplateId || '');
    if (!template) return;

    const workspaceW = 340;
    const workspaceH = workspaceW / template.aspectRatio;

    // Process all captured photos
    const bakedPhotos: string[] = [];

    for (let i = 0; i < this.originalPhotosBackup.length; i++) {
      const photoSrc = this.originalPhotosBackup[i];
      const stickers = this.photoStickers[i] || [];

      if (stickers.length === 0) {
        // No stickers placed on this photo, keep original
        bakedPhotos.push(photoSrc);
        continue;
      }

      // Load original image buffer
      const img = await loadImage(photoSrc);

      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not create Canvas 2D context');

      // Draw original picture
      ctx.drawImage(img, 0, 0);

      const scaleX = canvas.width / workspaceW;
      const scaleY = canvas.height / workspaceH;

      // Draw all stickers over the original picture
      for (const sticker of stickers) {
        ctx.save();

        const stickerCenterX = sticker.x + 32; // Center in workspace coords
        const stickerCenterY = sticker.y + 32;

        // Position on native high-res canvas
        ctx.translate(stickerCenterX * scaleX, stickerCenterY * scaleY);
        ctx.rotate(sticker.rotation * Math.PI / 180);

        // Standard emoji text drawing size (emoji is 40px base in workspace)
        const emojiFontSize = 40 * scaleX * sticker.scale;
        ctx.font = `${emojiFontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", "Courier New", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Burn sticker emoji onto photo
        ctx.fillText(sticker.emoji, 0, 0);

        ctx.restore();
      }

      bakedPhotos.push(canvas.toDataURL('image/png'));
    }

    // Update activeSession with the newly decorated photo buffers
    this.activeSession.capturedPhotos = bakedPhotos;
  }
}

import { BaseView } from './base';
import { CameraService } from '../services/camera';
import { getTemplateById } from '../templates';
import type { AppSession } from '../types';
import { audioManager } from '../services/audio';
import { hapticService } from '../services/haptics';

export class CaptureView extends BaseView {
  private cameraService: CameraService;
  private videoElement: HTMLVideoElement | null = null;
  private countdownOverlay: HTMLElement | null = null;
  private countdownText: HTMLElement | null = null;
  private photoStripElement: HTMLElement | null = null;
  private activeSession: AppSession;
  private countdownIntervalId: number | null = null;
  private activeSequenceTimeoutId: number | null = null;
  private isCaptureActive = false;
  private retakeIndex: number | null = null;

  constructor(
    element: HTMLElement,
    navigateTo: (state: any, params?: any) => void,
    session: AppSession
  ) {
    super(element, navigateTo);
    this.activeSession = session;
    this.cameraService = new CameraService();
  }

  mount(): void {
    this.element.innerHTML = `
      <div class="capture-screen-content">
        <div class="screen-header">
          <button class="btn-back" id="btn-capture-back">← CANCEL</button>
          <div class="header-titles">
            <h2 class="view-title" id="capture-title">GET READY</h2>
            <p class="view-subtitle" id="capture-subtitle">Strike a pose!</p>
          </div>
        </div>

        <div class="camera-viewport-container">
          <!-- Guided overlay frame -->
          <div class="camera-frame-guide"></div>
          
          <!-- Countdown centered overlay (no boxes) -->
          <div class="countdown-overlay hidden" id="countdown-overlay">
            <span id="countdown-text">3</span>
          </div>
          
          <!-- White screen shutter flash element -->
          <div class="shutter-flash" id="shutter-flash"></div>

          <!-- Video element -->
          <video id="webcam-preview" autoplay playsinline muted class="webcam-feed mirror"></video>
        </div>

        <div class="capture-controls">
          <!-- Live horizontal photo strip preview -->
          <div class="photo-strip" id="capture-photo-strip">
            <!-- Dynamic slots filled dynamically -->
          </div>
          
          <!-- Sleek camera shutter button -->
          <button class="shutter-button" id="btn-shutter" disabled>
            <span class="shutter-icon">📸</span>
          </button>
          
          <div class="camera-status-tag" id="camera-status">Initializing Camera...</div>
        </div>
      </div>
    `;

    this.videoElement = this.element.querySelector('#webcam-preview');
    this.countdownOverlay = this.element.querySelector('#countdown-overlay');
    this.countdownText = this.element.querySelector('#countdown-text');
    this.photoStripElement = this.element.querySelector('#capture-photo-strip');

    // Back Button listener
    const backBtn = this.element.querySelector('#btn-capture-back');
    backBtn?.addEventListener('click', () => {
      this.isCaptureActive = false;
      this.cameraService.stop();
      if (this.retakeIndex !== null) {
        this.navigateTo('review');
      } else {
        this.navigateTo('template-selection');
      }
    });

    // Shutter Button listener
    const shutterBtn = this.element.querySelector('#btn-shutter') as HTMLButtonElement;
    shutterBtn?.addEventListener('click', () => {
      const template = getTemplateById(this.activeSession.selectedTemplateId || '');
      if (!template) return;

      shutterBtn.disabled = true;
      shutterBtn.classList.add('hidden'); // Hide to keep camera screen clear during sequence

      audioManager.playBeep();
      this.runCaptureSequence(template.photoCount);
    });
  }

  unmount(): void {
    this.cameraService.stop();
    this.clearAllTimers();
  }

  async onEnter(params?: any): Promise<void> {
    this.isCaptureActive = true;
    const template = getTemplateById(this.activeSession.selectedTemplateId || '');
    if (!template) {
      console.error('No template selected, aborting');
      this.navigateTo('template-selection');
      return;
    }

    // Check if we are in retake mode
    if (params && typeof params.retakeIndex === 'number') {
      this.retakeIndex = params.retakeIndex;
      console.log(`Entering CaptureView in RETAKE mode for photo index: ${this.retakeIndex}`);
    } else {
      this.retakeIndex = null;
      // Reset session photos ONLY if NOT retaking
      this.activeSession.capturedPhotos = [];
      this.activeSession.ditheredPhotos = [];
    }

    // Title setup
    const titleEl = this.element.querySelector('#capture-title');
    const subtitleEl = this.element.querySelector('#capture-subtitle');
    
    if (this.retakeIndex !== null) {
      if (titleEl) titleEl.textContent = 'RETAKE PHOTO';
      if (subtitleEl) subtitleEl.textContent = `Retaking photo ${this.retakeIndex + 1} of ${template.photoCount}`;
    } else {
      if (titleEl) titleEl.textContent = template.name;
      if (subtitleEl) {
        subtitleEl.textContent = template.photoCount === 1 
          ? 'Tap the shutter to take photo!' 
          : `Tap the shutter to start ${template.photoCount}-photo sequence!`;
      }
    }

    // Render horizontal photo strip preview initially
    this.renderPhotoStrip(template.photoCount);

    // Reset shutter button UI state
    const shutterBtn = this.element.querySelector('#btn-shutter') as HTMLButtonElement;
    if (shutterBtn) {
      shutterBtn.disabled = true;
      shutterBtn.classList.remove('hidden');
    }

    // Start video
    const statusTag = this.element.querySelector('#camera-status');
    if (this.videoElement) {
      try {
        const { isMock } = await this.cameraService.start(this.videoElement);
        if (statusTag) {
          statusTag.textContent = isMock ? '🎥 SIMULATED CAMERA ACTIVE' : '🎥 CAMERA ACTIVE';
        }
        
        // Enable shutter button when camera stream settles
        if (shutterBtn) {
          shutterBtn.disabled = false;
        }
        
      } catch (err) {
        console.error('Camera startup failed', err);
        if (statusTag) {
          statusTag.textContent = '❌ Camera Error';
        }
      }
    }
  }

  onLeave(): void {
    this.isCaptureActive = false;
    this.cameraService.stop();
    this.clearAllTimers();
    if (this.countdownOverlay) this.countdownOverlay.classList.add('hidden');
  }

  private clearAllTimers() {
    if (this.countdownIntervalId !== null) {
      window.clearInterval(this.countdownIntervalId);
      this.countdownIntervalId = null;
    }
    if (this.activeSequenceTimeoutId !== null) {
      window.clearTimeout(this.activeSequenceTimeoutId);
      this.activeSequenceTimeoutId = null;
    }
  }

  private renderPhotoStrip(totalShots: number, activeIndex?: number) {
    if (!this.photoStripElement) return;

    let html = '';
    const currentActive = activeIndex !== undefined ? activeIndex : (this.retakeIndex !== null ? this.retakeIndex : 0);

    for (let i = 0; i < totalShots; i++) {
      const isRetakingThis = this.retakeIndex === i;
      const hasPhoto = this.activeSession.capturedPhotos[i] && !isRetakingThis;
      const isActive = i === currentActive;

      let slotClass = 'photo-strip-slot';
      if (hasPhoto) {
        slotClass += ' slot-captured';
      } else if (isActive) {
        slotClass += ' slot-active';
      } else {
        slotClass += ' slot-empty';
      }

      html += `
        <div class="${slotClass}" id="strip-slot-${i}">
          <div class="slot-number-badge">${i + 1}</div>
          ${hasPhoto 
            ? `<img src="${this.activeSession.capturedPhotos[i]}" class="slot-thumbnail" />` 
            : (isRetakingThis && isActive ? '<span style="font-size: 10px; font-weight: bold; color: var(--accent-color);">RETAKE</span>' : '')
          }
        </div>
      `;
    }

    this.photoStripElement.innerHTML = html;
  }

  /**
   * Run the countdown and capture photos based on count requirements
   */
  private async runCaptureSequence(totalShots: number) {
    this.isCaptureActive = true;

    if (this.retakeIndex !== null) {
      // Retake Mode
      const targetIdx = this.retakeIndex;
      this.renderPhotoStrip(totalShots, targetIdx);

      // Perform countdown
      await this.countdown(3);
      if (!this.isCaptureActive) return;

      // Shutter flash & capture
      this.triggerFlash();
      if (this.videoElement) {
        const frameData = this.cameraService.capture(this.videoElement);
        this.activeSession.capturedPhotos[targetIdx] = frameData;
      }

      this.renderPhotoStrip(totalShots, targetIdx);
      await new Promise((r) => setTimeout(r, 600));

      if (!this.isCaptureActive) return;

      this.cameraService.stop();
      this.navigateTo('review');
      return;
    }

    // Sequence Mode
    for (let shotIndex = 0; shotIndex < totalShots; shotIndex++) {
      if (!this.isCaptureActive) break;

      // 1. Update strip and progress text
      this.renderPhotoStrip(totalShots, shotIndex);
      const subtitleEl = this.element.querySelector('#capture-subtitle');
      if (subtitleEl) {
        subtitleEl.textContent = `Photo ${shotIndex + 1} of ${totalShots}`;
      }

      // 2. Perform Countdown (3, 2, 1)
      await this.countdown(3);
      if (!this.isCaptureActive) break;

      // 3. Shutter flash effect & capture frame
      this.triggerFlash();
      if (this.videoElement) {
        const frameData = this.cameraService.capture(this.videoElement);
        this.activeSession.capturedPhotos.push(frameData);
      }

      // 4. Update slot state to captured
      this.renderPhotoStrip(totalShots, shotIndex);

      // Pause briefly between shots in sequence
      if (shotIndex < totalShots - 1) {
        if (!this.isCaptureActive) break;
        await new Promise((r) => setTimeout(r, 1200));
      }
    }

    if (!this.isCaptureActive) return;

    // Sequence completed! Stop camera and move to Review View
    this.cameraService.stop();
    this.navigateTo('review');
  }

  /**
   * Async helper to count down from seconds
   */
  private countdown(seconds: number): Promise<void> {
    return new Promise((resolve) => {
      if (!this.countdownOverlay || !this.countdownText) {
        resolve();
        return;
      }

      this.countdownOverlay.classList.remove('hidden');
      this.countdownText.textContent = seconds.toString();
      
      // Play initial tick sound
      audioManager.playTick();

      // Scale pulse animation reset
      this.countdownText.classList.remove('scale-pulse');
      void (this.countdownText as HTMLElement).offsetWidth; // reflow trigger
      this.countdownText.classList.add('scale-pulse');

      // Add expanding ring
      const ring1 = document.createElement('div');
      ring1.className = 'countdown-ring';
      this.countdownOverlay.appendChild(ring1);
      setTimeout(() => ring1.remove(), 1000);

      let current = seconds;

      this.countdownIntervalId = window.setInterval(() => {
        if (!this.isCaptureActive) {
          if (this.countdownIntervalId !== null) {
            window.clearInterval(this.countdownIntervalId);
            this.countdownIntervalId = null;
          }
          resolve();
          return;
        }
        current--;
        if (current <= 0) {
          if (this.countdownIntervalId !== null) {
            window.clearInterval(this.countdownIntervalId);
            this.countdownIntervalId = null;
          }
          this.countdownOverlay!.classList.add('hidden');
          resolve();
        } else {
          this.countdownText!.textContent = current.toString();
          
          // Play countdown tick sound
          audioManager.playTick();

          this.countdownText!.classList.remove('scale-pulse');
          void (this.countdownText as HTMLElement).offsetWidth; // reflow trigger
          this.countdownText!.classList.add('scale-pulse');

          // Add expanding ring
          const ring2 = document.createElement('div');
          ring2.className = 'countdown-ring';
          this.countdownOverlay!.appendChild(ring2);
          setTimeout(() => ring2.remove(), 1000);
        }
      }, 1000);
    });
  }

  /**
   * Shutter Flash visual animation
   */
  private triggerFlash() {
    const flash = this.element.querySelector('#shutter-flash') as HTMLElement;
    if (flash) {
      flash.classList.remove('active');
      void flash.offsetWidth; // reflow
      flash.classList.add('active');
      
      // Play our high-quality synthesized mechanical shutter sound and heavy haptic!
      audioManager.playShutter();
      hapticService.impactHeavy();
    }
  }
}

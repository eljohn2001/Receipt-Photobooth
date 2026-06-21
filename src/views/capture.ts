import { BaseView } from './base';
import { CameraService } from '../services/camera';
import { getTemplateById } from '../templates';
import type { AppSession } from '../types';
import { audioManager } from '../services/audio';

export class CaptureView extends BaseView {
  private cameraService: CameraService;
  private videoElement: HTMLVideoElement | null = null;
  private countdownOverlay: HTMLElement | null = null;
  private countdownText: HTMLElement | null = null;
  private progressIndicators: HTMLElement | null = null;
  private activeSession: AppSession;
  private countdownIntervalId: number | null = null;
  private activeSequenceTimeoutId: number | null = null;
  private isCaptureActive = false;

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
          <!-- Shot sequence progress dots -->
          <div class="sequence-progress hidden" id="sequence-progress">
            <!-- Dynamic dots added during sequence -->
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
    this.progressIndicators = this.element.querySelector('#sequence-progress');

    // Back Button listener
    const backBtn = this.element.querySelector('#btn-capture-back');
    backBtn?.addEventListener('click', () => {
      this.isCaptureActive = false;
      this.cameraService.stop();
      this.navigateTo('template-selection');
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

  async onEnter(): Promise<void> {
    this.isCaptureActive = true;
    const template = getTemplateById(this.activeSession.selectedTemplateId || '');
    if (!template) {
      console.error('No template selected, aborting');
      this.navigateTo('template-selection');
      return;
    }

    // Reset session photos
    this.activeSession.capturedPhotos = [];
    this.activeSession.ditheredPhotos = [];

    // Title setup
    const titleEl = this.element.querySelector('#capture-title');
    const subtitleEl = this.element.querySelector('#capture-subtitle');
    if (titleEl) titleEl.textContent = template.name;
    if (subtitleEl) {
      subtitleEl.textContent = template.photoCount === 1 
        ? 'Tap the shutter to take photo!' 
        : `Tap the shutter to start ${template.photoCount}-photo sequence!`;
    }

    // Initialize progress indicators if multi-shot
    if (this.progressIndicators) {
      if (template.photoCount > 1) {
        this.progressIndicators.classList.remove('hidden');
        this.progressIndicators.innerHTML = Array.from({ length: template.photoCount })
          .map((_, i) => `<span class="seq-dot" id="seq-dot-${i}">${i + 1}</span>`)
          .join('');
      } else {
        this.progressIndicators.classList.add('hidden');
      }
    }

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

  /**
   * Run the countdown and capture photos based on count requirements
   */
  private async runCaptureSequence(totalShots: number) {
    this.isCaptureActive = true;
    for (let shotIndex = 0; shotIndex < totalShots; shotIndex++) {
      if (!this.isCaptureActive) break;
      // 1. Update active indicator dot
      if (totalShots > 1) {
        const activeDot = this.element.querySelector(`#seq-dot-${shotIndex}`);
        activeDot?.classList.add('active');
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

      // 4. Mark active dot as captured
      if (totalShots > 1) {
        const activeDot = this.element.querySelector(`#seq-dot-${shotIndex}`);
        activeDot?.classList.remove('active');
        activeDot?.classList.add('captured');
      }

      // Pause briefly between shots in sequence
      if (shotIndex < totalShots - 1) {
        if (!this.isCaptureActive) break;
        await new Promise((r) => setTimeout(r, 1200));
      }
    }

    if (!this.isCaptureActive) return;

    // Sequence completed! Stop camera and move to Preview View
    this.cameraService.stop();
    this.navigateTo('preview');
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
      
      // Play our high-quality synthesized mechanical shutter sound!
      audioManager.playShutter();
    }
  }
}

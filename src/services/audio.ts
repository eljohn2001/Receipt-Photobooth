export class AudioManagerClass {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;
  private humSourceNode: GainNode | null = null;
  private humOscs: OscillatorNode[] = [];
  private humNoiseSource: AudioBufferSourceNode | null = null;

  private initContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    return this.muted;
  }

  public isMuted(): boolean {
    return this.muted;
  }

  /**
   * Synthesize a quick mechanical click/tick for countdown
   */
  public playTick(): void {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.05);
    } catch (e) {
      console.warn('Failed to play tick sound:', e);
    }
  }

  /**
   * Synthesize a vintage mechanical camera shutter clack
   */
  public playShutter(): void {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const duration = 0.25;
      
      // 1. Create a white noise buffer for the shutter blades
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      // 2. Filter to make it sound mechanical
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1000, ctx.currentTime);
      filter.Q.setValueAtTime(3, ctx.currentTime);

      // 3. Shutter release click (fast sine wave burst)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(80, ctx.currentTime + 0.08);
      
      oscGain.gain.setValueAtTime(0.4, ctx.currentTime);
      oscGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

      // 4. Main shutter gain envelope (clack sound)
      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.25, ctx.currentTime);
      noiseGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.07);
      noiseGain.gain.setValueAtTime(0.2, ctx.currentTime + 0.09);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      // Connections
      noiseNode.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);

      // Play
      noiseNode.start(ctx.currentTime);
      osc.start(ctx.currentTime);
      
      noiseNode.stop(ctx.currentTime + duration);
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      console.warn('Failed to play shutter sound:', e);
    }
  }

  /**
   * Synthesize a mechanical paper-feed whirr and clicks (duration 5.5s)
   */
  public playDispenser(): void {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const duration = 5.5; // Matches the print animation duration
      const now = ctx.currentTime;

      // Stop any existing hum/dispenser sound
      this.stopDispenser();

      // 1. Motor Hum & Whirr
      const osc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      const gainNode = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(145, now);
      osc.frequency.linearRampToValueAtTime(155, now + duration);

      // LFO to create vibrating whirr
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(45, now); // hum frequency
      lfoGain.gain.setValueAtTime(18, now); // vibrato depth

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(380, now);

      // Connect LFO to oscillator frequency
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);

      // Fade in and out
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.25, now + 0.15); // fade in
      gainNode.gain.setValueAtTime(0.25, now + duration - 0.4);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration); // fade out

      osc.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start(now);
      lfo.start(now);
      osc.stop(now + duration);
      lfo.stop(now + duration);

      // Keep tracking references so we can stop it if they navigate away early
      this.humSourceNode = gainNode;
      this.humOscs = [osc, lfo];

      // 2. Add periodic roller gear clicks
      const clickInterval = 0.14; // every 140ms
      const numClicks = Math.floor(duration / clickInterval) - 2;

      for (let i = 0; i < numClicks; i++) {
        const clickTime = now + (i * clickInterval) + 0.1;
        
        const clickOsc = ctx.createOscillator();
        const clickGain = ctx.createGain();
        
        clickOsc.type = 'sine';
        clickOsc.frequency.setValueAtTime(1100, clickTime);
        clickOsc.frequency.exponentialRampToValueAtTime(80, clickTime + 0.015);
        
        clickGain.gain.setValueAtTime(0.06, clickTime);
        clickGain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.015);
        
        clickOsc.connect(clickGain);
        clickGain.connect(ctx.destination);
        
        clickOsc.start(clickTime);
        clickOsc.stop(clickTime + 0.02);
      }
    } catch (e) {
      console.warn('Failed to play dispenser sound:', e);
    }
  }

  /**
   * Stop the dispenser whirr
   */
  public stopDispenser(): void {
    if (this.humSourceNode) {
      try {
        const ctx = this.initContext();
        const now = ctx.currentTime;
        this.humSourceNode.gain.cancelScheduledValues(now);
        this.humSourceNode.gain.linearRampToValueAtTime(0, now + 0.1);
      } catch (err) {
        // Safe check
      }
      this.humSourceNode = null;
    }

    this.humOscs.forEach((osc) => {
      try {
        osc.stop();
      } catch (err) {}
    });
    this.humOscs = [];

    if (this.humNoiseSource) {
      try {
        this.humNoiseSource.stop();
      } catch (err) {}
      this.humNoiseSource = null;
    }
  }

  /**
   * Synthesize a mechanical paper tearing/ripping sound
   */
  public playPaperTear(): void {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const duration = 0.35;
      const now = ctx.currentTime;

      // Noise buffer for the paper fiber rip
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Generate noise with low-frequency crackle elements
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        const crackle = Math.sin(i * 0.05) > 0.9 ? 1.5 : 1.0;
        data[i] = white * 0.3 * crackle;
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      // Bandpass filter to isolate the paper ripping frequency band
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1100, now);
      filter.frequency.linearRampToValueAtTime(700, now + duration);
      filter.Q.setValueAtTime(2.5, now);

      // Volume envelope with rapid gain fluctuations (ripping texture)
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.35, now + 0.05); // fast attack
      
      const modLFO = ctx.createOscillator();
      const modGain = ctx.createGain();
      modLFO.type = 'sawtooth';
      modLFO.frequency.setValueAtTime(35, now); // 35Hz vibration
      modGain.gain.setValueAtTime(0.12, now);
      
      modLFO.connect(modGain);
      modGain.connect(gainNode.gain);

      // Decay
      gainNode.gain.setValueAtTime(0.25, now + duration - 0.1);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);

      // Connections
      noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      modLFO.start(now);
      noiseNode.start(now);

      modLFO.stop(now + duration);
      noiseNode.stop(now + duration);
    } catch (e) {
      console.warn('Failed to play paper tear sound:', e);
    }
  }

  /**
   * Synthesize a retro digital beep for touchscreen UI selections
   */
  public playBeep(): void {
    if (this.muted) return;
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'square';
      osc1.frequency.setValueAtTime(880, now);
      osc1.frequency.setValueAtTime(1320, now + 0.04);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1760, now);
      osc2.frequency.setValueAtTime(2200, now + 0.04);

      gain.gain.setValueAtTime(0.06, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.13);
      osc2.stop(now + 0.13);
    } catch (e) {
      console.warn('Failed to play beep sound:', e);
    }
  }
}

export const audioManager = new AudioManagerClass();

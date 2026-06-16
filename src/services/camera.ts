/**
 * Camera Service for accessing user webcam or providing an animated mock stream fallback.
 */

export class CameraService {
  private stream: MediaStream | null = null;
  private mockIntervalId: number | null = null;

  /**
   * Starts the camera and binds it to a video element.
   * Falls back to a mock animated stream if camera permission is denied or no devices exist.
   */
  async start(videoElement: HTMLVideoElement): Promise<{ isMock: boolean }> {
    this.stop(); // Stop any existing streams

    try {
      // Try to get actual media stream
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 640 },
          aspectRatio: 1.0, // Force square or near-square for standard kiosk formats
        },
        audio: false,
      });

      videoElement.srcObject = this.stream;
      videoElement.setAttribute('playsinline', 'true');
      await videoElement.play();
      return { isMock: false };
    } catch (error) {
      console.warn('Real camera failed or denied. Launching mock camera stream fallback:', error);
      const mockStream = this.startMockStream(videoElement);
      this.stream = mockStream;
      return { isMock: true };
    }
  }

  /**
   * Captures a frame from the video element and returns a base64 PNG data URL.
   */
  capture(videoElement: HTMLVideoElement): string {
    const canvas = document.createElement('canvas');
    // Match the active video resolution
    const width = videoElement.videoWidth || 640;
    const height = videoElement.videoHeight || 640;
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Flip horizontally for natural mirror preview in kiosk
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoElement, 0, 0, width, height);

    return canvas.toDataURL('image/png');
  }

  /**
   * Stops the active stream and clean up any canvas animation loops.
   */
  stop(): void {
    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }
    if (this.mockIntervalId !== null) {
      window.clearInterval(this.mockIntervalId);
      this.mockIntervalId = null;
    }
  }

  /**
   * Creates an animated mock stream by drawing to a canvas and returning its captureStream.
   */
  private startMockStream(videoElement: HTMLVideoElement): MediaStream {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 640;
    const ctx = canvas.getContext('2d')!;

    let frame = 0;
    const colors = ['#000000', '#0a0a0a'];
    const emojis = ['☕', '📸', '✨', '🥐', '❤️', '🍦'];

    const drawMockFrame = () => {
      frame++;
      
      // Draw background pattern
      ctx.fillStyle = colors[Math.floor(frame / 60) % colors.length];
      ctx.fillRect(0, 0, 640, 640);

      // Draw decorative grid
      ctx.strokeStyle = '#151515';
      ctx.lineWidth = 2;
      for (let i = 0; i < 640; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, 640);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(640, i);
        ctx.stroke();
      }

      // Draw bouncing/rotating shapes to show dynamic motion
      const centerX = 320;
      const centerY = 320;
      const radius = 150 + Math.sin(frame * 0.05) * 20;

      // Draw animated dashed circle
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      ctx.setLineDash([15, 10]);
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]); // Reset

      // Bouncing emoji
      const emoji = emojis[Math.floor(frame / 120) % emojis.length];
      ctx.font = '80px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const bounceY = centerY + Math.sin(frame * 0.08) * 40;
      const rotateAngle = Math.sin(frame * 0.03) * 0.3;

      ctx.save();
      ctx.translate(centerX, bounceY);
      ctx.rotate(rotateAngle);
      ctx.fillText(emoji, 0, 0);
      ctx.restore();

      // Draw Kiosk UI Overlay Simulator in Video
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fillRect(40, 40, 560, 560);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(40, 40, 560, 560);

      // Overlay text
      ctx.font = 'bold 24px monospace';
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'center';
      ctx.fillText('SIMULATED CAMERA STREAM', centerX, 80);
      ctx.fillText('STAND BY • READY TO SNAP', centerX, 560);

      // Pulsing recording dot
      if (Math.floor(frame / 30) % 2 === 0) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(100, 80, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.font = '16px monospace';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText('REC', 120, 85);
      }
    };

    // Initial draw
    drawMockFrame();

    // Loop
    this.mockIntervalId = window.setInterval(drawMockFrame, 1000 / 30); // 30 FPS

    // Capture canvas stream
    // @ts-ignore - captureStream might not be standard on all typescript libs but browser supports it
    const stream = canvas.captureStream ? canvas.captureStream(30) : (canvas as any).mozCaptureStream ? (canvas as any).mozCaptureStream(30) : null;
    
    if (stream) {
      videoElement.srcObject = stream;
      videoElement.setAttribute('playsinline', 'true');
      videoElement.play().catch(e => console.error("Error playing mock video stream:", e));
      return stream;
    } else {
      throw new Error('Canvas captureStream not supported in this environment');
    }
  }
}

let wakeLock: any = null;

/**
 * Requests the browser engine to hold a Screen Wake Lock, preventing the screen from dimming or sleeping.
 */
export async function requestWakeLock(): Promise<void> {
  if (!('wakeLock' in navigator)) {
    console.warn('Screen Wake Lock API is not supported in this browser/device.');
    return;
  }

  try {
    wakeLock = await (navigator as any).wakeLock.request('screen');
    console.log('Screen Wake Lock acquired. Display will stay awake.');

    wakeLock.addEventListener('release', () => {
      console.log('Screen Wake Lock was released.');
    });
  } catch (err: any) {
    console.error(`Failed to acquire Screen Wake Lock: ${err.name}, ${err.message}`);
  }
}

/**
 * Releases the Screen Wake Lock if currently active.
 */
export function releaseWakeLock(): void {
  if (wakeLock) {
    wakeLock.release().then(() => {
      wakeLock = null;
      console.log('Screen Wake Lock released manually.');
    }).catch((err: any) => {
      console.error('Failed to release Screen Wake Lock:', err);
    });
  }
}

// Re-request wake lock automatically if the app goes to background and comes back
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState === 'visible') {
      await requestWakeLock();
    }
  });
}

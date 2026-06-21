import { Device } from '@capacitor/device';
import { verifyLicenseKeyOnline, supabase } from './supabase';

const LICENSE_CACHE_KEY = 'receipt_booth_license_activation';
const OFFLINE_GRACE_PERIOD_MS = 15 * 24 * 60 * 60 * 1000; // 15 Days Grace Period

export interface CachedLicenseState {
  licenseKey: string;
  deviceId: string;
  activatedAt: string;
  lastVerifiedAt: string;
  clientName: string;
}

/**
 * Returns a stable unique ID for this device.
 * Uses Capacitor's Device plugin on native platforms, and falls back to a generated local UUID in browsers.
 */
export async function getDeviceUUID(): Promise<string> {
  try {
    const info = await Device.getId();
    const id = info.identifier;
    if (id && id.trim() !== '') {
      return id.trim();
    }
  } catch (e) {
    console.warn('Capacitor Device.getId() not available, falling back to local UUID storage.', e);
  }

  // Fallback for browser/web environment
  const WEB_DEVICE_ID_KEY = 'receipt_booth_web_device_uuid';
  let webId = localStorage.getItem(WEB_DEVICE_ID_KEY);
  if (!webId) {
    // Generate a cryptographically strong UUID or standard random fallback
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      webId = crypto.randomUUID();
    } else {
      webId = 'web-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);
    }
    localStorage.setItem(WEB_DEVICE_ID_KEY, webId);
  }
  return webId;
}

/**
 * Get the currently cached license activation details.
 */
export function getCachedLicense(): CachedLicenseState | null {
  const cached = localStorage.getItem(LICENSE_CACHE_KEY);
  if (!cached) return null;
  try {
    return JSON.parse(cached) as CachedLicenseState;
  } catch (e) {
    console.error('Failed to parse cached license state:', e);
    return null;
  }
}

/**
 * Saves license activation details locally.
 */
function setCachedLicense(state: CachedLicenseState): void {
  localStorage.setItem(LICENSE_CACHE_KEY, JSON.stringify(state));
}

/**
 * Deactivates and deletes the license registration online, then clears local storage.
 * This allows the license key to be reused on another device.
 */
export async function deactivateLicense(): Promise<void> {
  const cached = getCachedLicense();
  if (cached) {
    try {
      // Unbind device ID in Supabase
      await supabase
        .from('licenses')
        .update({
          device_id: null,
          activated_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('key', cached.licenseKey);
    } catch (e) {
      console.warn('Failed to unbind license online during deactivation:', e);
    }
  }
  localStorage.removeItem(LICENSE_CACHE_KEY);
}

/**
 * Validates the activation key online and binds it to the current device.
 */
export async function activateLicense(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    const deviceId = await getDeviceUUID();
    const result = await verifyLicenseKeyOnline(key, deviceId);

    if (result.success && result.license) {
      const now = new Date().toISOString();
      const state: CachedLicenseState = {
        licenseKey: result.license.key,
        deviceId: deviceId,
        activatedAt: result.license.activated_at || now,
        lastVerifiedAt: now,
        clientName: result.license.client_name || 'Valued Partner'
      };
      setCachedLicense(state);
      return { success: true };
    }

    return { success: false, error: result.error || 'Activation failed.' };
  } catch (e) {
    console.error('Activation exception:', e);
    return { success: false, error: 'An unexpected error occurred during activation.' };
  }
}

/**
 * Perform startup check of the license key.
 * 1. Checks if a license exists locally.
 * 2. If online, verifies it against Supabase.
 * 3. If offline, checks if it falls within the 15-day grace period since the last successful verification.
 */
export async function checkLicenseOnStartup(): Promise<boolean> {
  const cached = getCachedLicense();
  if (!cached) {
    return false; // No license found
  }

  const deviceId = await getDeviceUUID();

  // Enforce UUID match (in case localStorage was cloned or copied manually)
  if (cached.deviceId !== deviceId) {
    console.warn('License device ID mismatch. Activation required.');
    localStorage.removeItem(LICENSE_CACHE_KEY);
    return false;
  }

  // Check if we are online
  if (navigator.onLine) {
    try {
      console.log('Online: Verifying license key with Supabase...');
      const result = await verifyLicenseKeyOnline(cached.licenseKey, deviceId);
      if (result.success && result.license) {
        // Update verification time
        cached.lastVerifiedAt = new Date().toISOString();
        if (result.license.client_name) {
          cached.clientName = result.license.client_name;
        }
        setCachedLicense(cached);
        console.log('License verification successful!');
        return true;
      } else if (result.isTransientError) {
        console.warn('Transient database/network error checking license online. Falling back to offline grace period check:', result.error);
        // Do NOT wipe license key. Fall through to offline check.
      } else {
        console.error('License key rejected online:', result.error);
        localStorage.removeItem(LICENSE_CACHE_KEY);
        return false;
      }
    } catch (err) {
      console.warn('Network issue checking license. Relying on offline check:', err);
    }
  }

  // Offline or network error: check grace period
  const lastVerified = new Date(cached.lastVerifiedAt).getTime();
  const now = Date.now();
  const timeSinceLastVerification = now - lastVerified;

  if (timeSinceLastVerification < OFFLINE_GRACE_PERIOD_MS) {
    const daysLeft = Math.ceil((OFFLINE_GRACE_PERIOD_MS - timeSinceLastVerification) / (24 * 60 * 60 * 1000));
    console.log(`Running offline. License is cached. Grace period active (${daysLeft} days remaining).`);
    return true;
  }

  console.warn('Offline grace period expired. License verification required.');
  return false;
}

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ylmoddvrrwvyxpyeqdzf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlsbW9kZHZycnd2eXhweWVxZHpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3NzAwMDYsImV4cCI6MjA5NzM0NjAwNn0.tTuys60HEzrExP_6TwR3XyIZUOc4V9O04ynC36-sttU';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export interface LicenseRecord {
  id: string;
  key: string;
  client_name: string | null;
  client_email: string | null;
  device_id: string | null;
  is_active: boolean;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Checks a license key against Supabase.
 * - If the key doesn't exist or is inactive, returns error.
 * - If the key is active and already registered to another device_id, returns error.
 * - If the key is active and has no registered device_id, binds it to the current device_id.
 * - If the key is active and matches the current device_id, returns success.
 */
export async function verifyLicenseKeyOnline(
  key: string,
  deviceId: string
): Promise<{ success: boolean; error?: string; license?: LicenseRecord; isTransientError?: boolean }> {
  try {
    // 1. Fetch license by key
    const { data: license, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('key', key.trim())
      .maybeSingle();

    if (error) {
      console.error('Supabase query error verifying license:', error);
      return { success: false, error: 'Database error occurred. Please try again.', isTransientError: true };
    }

    if (!license) {
      return { success: false, error: 'Invalid activation key. Please check and try again.', isTransientError: false };
    }

    const record = license as LicenseRecord;

    if (!record.is_active) {
      return { success: false, error: 'This activation key has been deactivated.', isTransientError: false };
    }

    // 2. Check device binding
    if (record.device_id && record.device_id !== deviceId) {
      return { success: false, error: 'This key is already activated on another device.', isTransientError: false };
    }

    // 3. If device_id is empty, bind it to this device
    if (!record.device_id) {
      const { data: updatedLicense, error: updateError } = await supabase
        .from('licenses')
        .update({
          device_id: deviceId,
          activated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', record.id)
        .select('*')
        .single();

      if (updateError) {
        console.error('Supabase update error binding device:', updateError);
        return { success: false, error: 'Failed to bind license to this device. Try again.', isTransientError: true };
      }

      return { success: true, license: updatedLicense as LicenseRecord };
    }

    // 4. Already bound to this device, return success
    return { success: true, license: record };
  } catch (err) {
    console.error('Exception during license verification:', err);
    return { success: false, error: 'Network or connection error. Please check your internet.', isTransientError: true };
  }
}

/**
 * Uploads a file blob to the private Supabase Storage bucket 'receipts'
 * and returns a signed URL that expires in 1 hour (3600 seconds).
 */
export async function uploadReceiptPhoto(blob: Blob, path: string): Promise<string> {
  // 1. Upload to the storage bucket
  const { error } = await supabase.storage
    .from('receipts')
    .upload(path, blob, {
      contentType: 'image/png',
      upsert: false,
    });

  if (error) {
    console.error('Supabase Storage upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }

  // 2. Generate signed URL expiring in 3600 seconds (1 hour)
  const { data: signedData, error: signedError } = await supabase.storage
    .from('receipts')
    .createSignedUrl(path, 3600);

  if (signedError || !signedData?.signedUrl) {
    console.error('Supabase Storage signed URL error:', signedError);
    throw new Error('Failed to generate expiring download link.');
  }

  return signedData.signedUrl;
}

/**
 * Uploads a file blob to the Supabase Storage bucket without generating a signed URL.
 */
export async function uploadRawReceiptPhoto(blob: Blob, path: string): Promise<void> {
  const { error } = await supabase.storage
    .from('receipts')
    .upload(path, blob, {
      contentType: 'image/png',
      upsert: false,
    });

  if (error) {
    console.error('Supabase Storage upload error:', error);
    throw new Error(`Upload failed: ${error.message}`);
  }
}

/**
 * Generates a short random ID for sharing.
 */
export function generateShortId(length = 6): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export interface ShareRecord {
  id: string;
  bw_path: string;
  color_path: string;
  created_at: string;
}

/**
 * Uploads both B&W and Color receipt images, creates a short-ID share record,
 * and returns the short share ID.
 */
export async function createShareRecord(bwBlob: Blob, colorBlob: Blob, customShareId?: string): Promise<string> {
  const shareId = customShareId || generateShortId(6);
  const fileId = `${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
  
  const bwPath = `receipts/${fileId}-bw.png`;
  const colorPath = `receipts/${fileId}-color.png`;

  console.log(`Uploading files and creating share: ${shareId}...`);

  // Upload in parallel
  await Promise.all([
    uploadRawReceiptPhoto(bwBlob, bwPath),
    uploadRawReceiptPhoto(colorBlob, colorPath)
  ]);

  // Insert share record in Supabase
  const { error } = await supabase
    .from('shares')
    .insert({
      id: shareId,
      bw_path: bwPath,
      color_path: colorPath
    });

  if (error) {
    console.error('Failed to create share record in Supabase:', error);
    throw new Error(`Failed to save share record: ${error.message}`);
  }

  return shareId;
}

/**
 * Fetches the share record by its short ID.
 * Returns null if the share is expired (handled by RLS policy) or not found.
 */
export async function getShareRecord(shareId: string): Promise<ShareRecord | null> {
  const { data, error } = await supabase
    .from('shares')
    .select('*')
    .eq('id', shareId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching share record:', error);
    return null;
  }

  return data as ShareRecord | null;
}

/**
 * Returns the public storage URL for a given storage path.
 */
export function getPublicStorageUrl(path: string): string {
  const { data } = supabase.storage
    .from('receipts')
    .getPublicUrl(path);
    
  return data.publicUrl;
}

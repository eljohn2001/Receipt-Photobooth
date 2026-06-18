import { createShareRecord } from './supabase';

/**
 * Uploads both B&W and Color receipt images in parallel, registers them 
 * under a short activation sharing ID, and returns that ID.
 */
export async function uploadReceiptPhotos(
  bwBlob: Blob, 
  colorBlob: Blob
): Promise<string> {
  console.log('Initiating parallel upload and share record creation...');
  try {
    const shareId = await createShareRecord(bwBlob, colorBlob);
    console.log(`Share record created successfully with ID: ${shareId}`);
    return shareId;
  } catch (err) {
    console.error('Failed to upload photos and create share record:', err);
    throw err;
  }
}

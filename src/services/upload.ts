import { loadKioskConfig } from './config';

/**
 * Uploads a binary image Blob to ImgBB and returns the public URL.
 */
export async function uploadToImgBB(blob: Blob, apiKey: string): Promise<string> {
  const formData = new FormData();
  formData.append('image', blob);

  const res = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
    method: 'POST',
    body: formData
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `ImgBB upload failed with status ${res.status}`);
  }

  const data = await res.json();
  if (data && data.success && data.data && data.data.url) {
    return data.data.url;
  }

  throw new Error('Invalid response structure from ImgBB');
}

/**
 * Uploads a binary image Blob to Imgur anonymously and returns the public URL.
 */
export async function uploadToImgur(blob: Blob): Promise<string> {
  const config = loadKioskConfig();
  const clientId = (config.imgurClientId && config.imgurClientId.trim() !== '') 
    ? config.imgurClientId.trim() 
    : '6e08c02c63d5ad3'; 
  const formData = new FormData();
  formData.append('image', blob);

  const res = await fetch('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: {
      Authorization: `Client-ID ${clientId}`
    },
    body: formData
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData?.data?.error || `Upload failed with status ${res.status}`);
  }

  const data = await res.json();
  if (data && data.data && data.data.link) {
    return data.data.link;
  }
  
  throw new Error('Invalid response structure from Imgur');
}

/**
 * Upload wrapper that tries ImgBB if configured, falling back to Imgur.
 */
export async function uploadImage(blob: Blob): Promise<string> {
  const config = loadKioskConfig();
  const imgbbKey = (config.imgbbApiKey && config.imgbbApiKey.trim() !== '') 
    ? config.imgbbApiKey.trim() 
    : 'c6b792880a4b31c6d365bd5586f10dc2';

  if (imgbbKey) {
    try {
      console.log('Attempting upload to ImgBB...');
      return await uploadToImgBB(blob, imgbbKey);
    } catch (err) {
      console.warn('ImgBB upload failed, trying Imgur fallback:', err);
    }
  }

  console.log('Attempting upload to Imgur...');
  return await uploadToImgur(blob);
}

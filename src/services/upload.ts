/**
 * Uploads a binary image Blob to Imgur anonymously and returns the public URL.
 */
export async function uploadToImgur(blob: Blob): Promise<string> {
  // Free Imgur Client-ID registered for the application
  const clientId = '6e08c02c63d5ad3'; 
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

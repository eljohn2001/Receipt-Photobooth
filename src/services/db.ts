const DB_NAME = 'receipt_booth_db';
const DB_VERSION = 3;
const STORE_NAME = 'media_store';
const BG_MEDIA_KEY = 'custom_background';

export interface OfflineShare {
  id: string;
  timestamp: string;
  bwBlob: Blob;
  colorBlob: Blob;
}

export interface LocalSession {
  id: string;
  boothId: string;
  createdAt: string;
  layoutType: string;
  templateId: string;
  printsCount: number;
  additionalPrints: number;
  totalAmount: number;
  shareId: string | null;
  syncStatus: 'pending' | 'synced';
  packageName: string | null;
  packagePrice: number | null;
  completionStatus: 'completed' | 'cancelled';
}

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
      if (!db.objectStoreNames.contains('offline_shares')) {
        db.createObjectStore('offline_shares', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('sessions')) {
        db.createObjectStore('sessions', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveBackgroundMedia(blob: Blob): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(blob, BG_MEDIA_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getBackgroundMedia(): Promise<Blob | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(BG_MEDIA_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to retrieve background media from IndexedDB:', err);
    return null;
  }
}

export async function deleteBackgroundMedia(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(BG_MEDIA_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveOfflineShare(share: OfflineShare): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('offline_shares', 'readwrite');
    const store = transaction.objectStore('offline_shares');
    const request = store.put(share);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function listOfflineShares(): Promise<OfflineShare[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('offline_shares', 'readonly');
      const store = transaction.objectStore('offline_shares');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to list offline shares from IndexedDB:', err);
    return [];
  }
}

export async function deleteOfflineShare(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('offline_shares', 'readwrite');
    const store = transaction.objectStore('offline_shares');
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function saveLocalSession(session: LocalSession): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sessions', 'readwrite');
    const store = transaction.objectStore('sessions');
    const request = store.put(session);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function listLocalSessions(): Promise<LocalSession[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction('sessions', 'readonly');
      const store = transaction.objectStore('sessions');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to list local sessions from IndexedDB:', err);
    return [];
  }
}

export async function updateLocalSessionSyncStatus(id: string, status: 'pending' | 'synced'): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction('sessions', 'readwrite');
    const store = transaction.objectStore('sessions');
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const data = getRequest.result as LocalSession | undefined;
      if (data) {
        data.syncStatus = status;
        const putRequest = store.put(data);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error(`Session ${id} not found to update sync status`));
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

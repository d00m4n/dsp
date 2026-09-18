/**
 * Hand-written, promisified IndexedDB wrapper for user-picked wallpapers.
 * No library — the app has no runtime dependencies. Every exported function
 * opens the database, runs one transaction, and closes the connection again;
 * no connection is kept open across calls (simplicity over micro-perf, which
 * matches this project's small scale).
 */

import { generateId } from '../utils/id';

const DB_NAME = 'homebase-wallpapers';
const DB_VERSION = 1;
const STORE_NAME = 'wallpapers';

export interface StoredWallpaper {
  id: string;
  blob: Blob;
  mimeType: string;
  sizeBytes: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putWallpaper(blob: Blob): Promise<string> {
  const id = generateId();
  const record: StoredWallpaper = {
    id,
    blob,
    mimeType: blob.type,
    sizeBytes: blob.size,
  };
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
  return id;
}

export async function getWallpaper(id: string): Promise<StoredWallpaper | null> {
  const db = await openDb();
  try {
    return await new Promise<StoredWallpaper | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).get(id);
      request.onsuccess = () => resolve((request.result as StoredWallpaper | undefined) ?? null);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

export async function deleteWallpaper(id: string): Promise<void> {
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function listWallpaperIds(): Promise<string[]> {
  const db = await openDb();
  try {
    return await new Promise<string[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const request = tx.objectStore(STORE_NAME).getAllKeys();
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

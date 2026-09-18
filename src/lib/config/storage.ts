const STORAGE_KEY = 'homebase:config';
const BACKUP_KEY = 'homebase:config:backup';

/** In-memory fallback used when localStorage is unavailable (private mode, quota 0, disabled). */
const memoryFallback = new Map<string, string>();

function hasLocalStorage(): boolean {
  try {
    const probeKey = '__homebase_probe__';
    localStorage.setItem(probeKey, '1');
    localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

export function readRawConfig(): string | null {
  try {
    if (hasLocalStorage()) {
      return localStorage.getItem(STORAGE_KEY);
    }
    return memoryFallback.get(STORAGE_KEY) ?? null;
  } catch {
    return memoryFallback.get(STORAGE_KEY) ?? null;
  }
}

export function writeRawConfig(raw: string): void {
  try {
    if (hasLocalStorage()) {
      localStorage.setItem(STORAGE_KEY, raw);
      return;
    }
  } catch {
    // fall through to in-memory fallback
  }
  memoryFallback.set(STORAGE_KEY, raw);
}

export function clearStoredConfig(): void {
  try {
    if (hasLocalStorage()) {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // ignore
  }
  memoryFallback.delete(STORAGE_KEY);
}

export function readConfigBackup(): string | null {
  try {
    if (hasLocalStorage()) {
      return localStorage.getItem(BACKUP_KEY);
    }
    return memoryFallback.get(BACKUP_KEY) ?? null;
  } catch {
    return memoryFallback.get(BACKUP_KEY) ?? null;
  }
}

/**
 * Unlike `writeRawConfig`, this does not swallow `QuotaExceededError` — the
 * caller (about to overwrite the live config) needs to know the backup failed.
 */
export function writeConfigBackup(raw: string): void {
  if (hasLocalStorage()) {
    localStorage.setItem(BACKUP_KEY, raw);
    return;
  }
  memoryFallback.set(BACKUP_KEY, raw);
}

// Guest data is kept separately; selecting an account never imports it implicitly.
export type AccountCache = {
  snapshot: string;
  revision: number;
  dirty: boolean;
};

export const GUEST_KEY = 'bisara-progress-v1';
export const PROGRESS_EVENT = 'bisara-progress-change';
export const CACHED_USER_KEY = 'bisara-cached-user-v1';

export type CachedUserProfile = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
};

let accountId: string | null = null;
const memory = new Map<string, string>();
let storageFailed = false;

export function readCachedUser(): CachedUserProfile | null {
  try {
    const raw = readLocal(CACHED_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      typeof parsed.id === 'string' &&
      typeof parsed.displayName === 'string'
    ) {
      return parsed as CachedUserProfile;
    }
    return null;
  } catch {
    return null;
  }
}

export function writeCachedUser(user: CachedUserProfile | null) {
  if (user) {
    writeLocal(CACHED_USER_KEY, JSON.stringify(user));
  } else {
    try {
      window.localStorage.removeItem(CACHED_USER_KEY);
    } catch {
      writeLocal(CACHED_USER_KEY, '');
    }
  }
}

export function readLocal(key: string): string | null {
  try {
    if (!storageFailed) {
      const value = window.localStorage.getItem(key);
      if (value !== null) memory.set(key, value);
      return value;
    }
  } catch {
    storageFailed = true;
  }
  return memory.get(key) ?? null;
}

export function writeLocal(key: string, value: string) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    storageFailed = true;
  }
}

export function hasPersistentStorage() {
  return !storageFailed;
}

export function accountKey(id: string) {
  return `bisara-account-progress-v1:${id}`;
}

export function readAccountCache(id: string): AccountCache | null {
  try {
    const data: unknown = JSON.parse(readLocal(accountKey(id)) ?? 'null');
    if (typeof data !== 'object' || data === null) return null;
    if (
      !('snapshot' in data) ||
      typeof data.snapshot !== 'string' ||
      !('revision' in data) ||
      !Number.isSafeInteger(data.revision) ||
      typeof data.revision !== 'number' ||
      data.revision < 0 ||
      !('dirty' in data) ||
      typeof data.dirty !== 'boolean'
    )
      return null;
    JSON.parse(data.snapshot);
    return {
      snapshot: data.snapshot,
      revision: data.revision,
      dirty: data.dirty,
    };
  } catch {
    return null;
  }
}

export function notifyProgress() {
  window.dispatchEvent(new Event(PROGRESS_EVENT));
}

export function saveAccountCache(id: string, cache: AccountCache) {
  writeLocal(accountKey(id), JSON.stringify(cache));
  notifyProgress();
}

export function selectProgressAccount(id: string | null) {
  accountId = id;
  notifyProgress();
}

export function scopedProgressKey() {
  return accountId ? accountKey(accountId) : GUEST_KEY;
}

export function scopedSnapshot(guestDefault: string, accountDefault: string) {
  if (accountId) return readAccountCache(accountId)?.snapshot ?? accountDefault;
  return readLocal(GUEST_KEY) ?? guestDefault;
}

export function writeScopedSnapshot(snapshot: string) {
  if (accountId) {
    const cache = readAccountCache(accountId);
    saveAccountCache(accountId, {
      snapshot,
      revision: cache?.revision ?? 0,
      dirty: true,
    });
  } else {
    writeLocal(GUEST_KEY, snapshot);
    notifyProgress();
  }
}

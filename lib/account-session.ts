import { ApiError, apiRequest } from '@/lib/api-client';
import {
  GUEST_KEY,
  hasPersistentStorage,
  readAccountCache,
  readLocal,
  saveAccountCache,
  selectProgressAccount,
  writeLocal,
} from '@/lib/account-cache';
import {
  emptyAccountProgress,
  parseProgressSnapshot,
  type UserProgress,
} from '@/lib/progress-storage';

export type AccountUser = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
};
type RemoteProgress = Omit<UserProgress, 'lastActiveDate' | 'reviewDate'> & {
  lastActiveDate: string | null;
  reviewDate: string | null;
  revision: number;
  updatedAt: string;
};
export type AccountState = {
  user: AccountUser | null;
  status: 'loading' | 'guest' | 'ready' | 'offline' | 'expired';
  sync: 'idle' | 'saving' | 'saved' | 'pending' | 'conflict';
  message: string;
};
const initial: AccountState = {
  user: null,
  status: 'loading',
  sync: 'idle',
  message: '',
};
let state = initial;
let generation = 0;
let activeSave: Promise<void> | null = null;
const listeners = new Set<() => void>();
export const AUTH_EVENT_KEY = 'bisara-auth-changed';
export const getAccountSnapshot = () => state;
export const getServerAccountSnapshot = () => initial;
export function subscribeAccount(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}
function publish(patch: Partial<AccountState>) {
  state = { ...state, ...patch };
  for (const listener of listeners) listener();
}
function announceAuthChange() {
  writeLocal(AUTH_EVENT_KEY, crypto.randomUUID());
}

function remoteSnapshot(remote: RemoteProgress) {
  const { revision: _revision, updatedAt: _updatedAt, ...progress } = remote;
  return JSON.stringify({
    ...progress,
    lastActiveDate: progress.lastActiveDate ?? '',
    reviewDate: progress.reviewDate ?? '',
    weeklyActivity: progress.weeklyActivity.length
      ? progress.weeklyActivity
      : emptyAccountProgress.weeklyActivity,
  });
}

export async function refreshAccount() {
  const epoch = ++generation;
  publish({ user: null, status: 'loading', sync: 'idle', message: '' });
  selectProgressAccount(null);
  try {
    const user = await apiRequest<AccountUser>('/auth/me');
    const remote = await apiRequest<RemoteProgress>('/progress', {
      headers: { 'X-Progress-Owner': user.id },
    });
    if (epoch !== generation) return;
    const cached = readAccountCache(user.id);
    if (!cached?.dirty) {
      saveAccountCache(user.id, {
        snapshot: remoteSnapshot(remote),
        revision: remote.revision,
        dirty: false,
      });
    }
    selectProgressAccount(user.id);
    const conflict = cached?.dirty && cached.revision !== remote.revision;
    publish({
      user,
      status: 'ready',
      sync: conflict ? 'conflict' : cached?.dirty ? 'pending' : 'saved',
      message: conflict
        ? 'Progres di server telah berubah. Progres lokal tetap disimpan; pilih versi yang ingin digunakan.'
        : '',
    });
    if (!conflict && cached?.dirty) await syncProgress();
  } catch (error) {
    if (epoch !== generation) return;
    const guest = error instanceof ApiError && error.status === 401;
    publish({
      user: null,
      status: guest ? 'guest' : 'offline',
      sync: 'idle',
      message: guest
        ? ''
        : 'Server akun belum terhubung. Mode tamu tetap dapat digunakan.',
    });
  }
}

export async function authenticate(
  mode: 'login' | 'register',
  fields: { email: string; password: string; displayName?: string },
) {
  await apiRequest<AccountUser>(`/auth/${mode}`, {
    method: 'POST',
    body: JSON.stringify(fields),
  });
  announceAuthChange();
  await refreshAccount();
}

export async function logoutAccount() {
  // Flush pending changes first. Errors/conflicts keep the session and local cache intact.
  await syncProgress();
  if (state.sync === 'conflict' || state.sync === 'pending') {
    throw new Error(
      'Sinkronisasi belum selesai. Selesaikan konflik atau coba sinkronkan kembali sebelum keluar.',
    );
  }
  if (activeSave) await activeSave;
  await apiRequest<void>('/auth/logout', { method: 'POST' });
  generation++;
  selectProgressAccount(null);
  publish({ user: null, status: 'guest', sync: 'idle', message: '' });
  announceAuthChange();
}

export function syncProgress(): Promise<void> {
  if (activeSave) return activeSave;
  const user = state.user;
  if (!user || state.status !== 'ready' || state.sync === 'conflict')
    return Promise.resolve();
  const epoch = generation;
  activeSave = (async () => {
    // Read again after every acknowledgement so edits made while saving are not lost.
    while (epoch === generation) {
      const cached = readAccountCache(user.id);
      if (!cached?.dirty) break;
      publish({ sync: 'saving', message: '' });
      try {
        const progress = parseProgressSnapshot(cached.snapshot);
        const remote = await apiRequest<RemoteProgress>('/progress', {
          method: 'PUT',
          headers: { 'X-Progress-Owner': user.id },
          body: JSON.stringify({
            ...progress,
            lastActiveDate: progress.lastActiveDate || null,
            reviewDate: progress.reviewDate || null,
            expectedRevision: cached.revision,
          }),
        });
        if (epoch !== generation) return;
        const current = readAccountCache(user.id);
        const editedDuringSave = current?.snapshot !== cached.snapshot;
        saveAccountCache(user.id, {
          snapshot:
            editedDuringSave && current
              ? current.snapshot
              : remoteSnapshot(remote),
          revision: remote.revision,
          dirty: editedDuringSave,
        });
        publish({ sync: editedDuringSave ? 'pending' : 'saved' });
      } catch (error) {
        if (epoch !== generation) return;
        if (error instanceof ApiError && [401, 403].includes(error.status)) {
          generation++;
          selectProgressAccount(null);
          publish({
            user: null,
            status: 'expired',
            sync: 'idle',
            message:
              'Sesi berakhir. Perubahan akun tersimpan lokal; masuk kembali untuk menyinkronkan.',
          });
          return;
        }
        publish({
          sync:
            error instanceof ApiError && error.status === 409
              ? 'conflict'
              : 'pending',
          message:
            error instanceof ApiError && error.status === 409
              ? 'Versi server berbeda. Pilih penanganan konflik pada halaman akun.'
              : 'Perubahan tersimpan lokal dan belum terkirim. Gunakan tombol sinkronkan saat koneksi pulih.',
        });
        return;
      }
    }
  })().finally(() => {
    activeSave = null;
  });
  return activeSave;
}

export async function resolveProgressConflict(choice: 'server' | 'local') {
  const user = state.user;
  if (!user || state.sync !== 'conflict') return;
  if (activeSave) await activeSave;
  const epoch = generation;
  const remote = await apiRequest<RemoteProgress>('/progress', {
    headers: { 'X-Progress-Owner': user.id },
  });
  if (epoch !== generation) return;
  const local = readAccountCache(user.id);
  // Keep both versions as a recovery point before the explicit choice.
  writeLocal(
    `bisara-conflict-backup:${user.id}:${Date.now()}`,
    JSON.stringify({ local, remote }),
  );
  saveAccountCache(user.id, {
    snapshot:
      choice === 'local' && local ? local.snapshot : remoteSnapshot(remote),
    revision: remote.revision,
    dirty: choice === 'local',
  });
  publish({ sync: choice === 'local' ? 'pending' : 'saved', message: '' });
  if (choice === 'local') await syncProgress();
}

export function importGuestProgress() {
  const user = state.user;
  if (
    !user ||
    state.status !== 'ready' ||
    state.sync === 'conflict' ||
    activeSave
  )
    return;
  const cached = readAccountCache(user.id);
  const guest = readLocal(GUEST_KEY);
  // Only a pristine account can import. Existing account data is never merged automatically.
  if (!cached || cached.revision !== 0 || cached.dirty || !guest) return;
  saveAccountCache(user.id, {
    snapshot: JSON.stringify(parseProgressSnapshot(guest)),
    revision: 0,
    dirty: true,
  });
  void syncProgress();
}

export function canImportGuestProgress() {
  if (!state.user || typeof window === 'undefined') return false;
  const cached = readAccountCache(state.user.id);
  return cached?.revision === 0 && !cached.dirty && !!readLocal(GUEST_KEY);
}
export { hasPersistentStorage };

import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  authenticate,
  getAccountSnapshot,
  refreshAccount,
  syncProgress,
  logoutAccount,
  resolveProgressConflict,
} from '@/lib/account-session';
import {
  GUEST_KEY,
  accountKey,
  readAccountCache,
  readLocal,
  writeLocal,
  writeScopedSnapshot,
} from '@/lib/account-cache';
import {
  emptyAccountProgress,
  getProgressSnapshot,
} from '@/lib/progress-storage';

// Controlled browser and HTTP boundary. Tests exercise actual synchronization code.
const data = new Map<string, string>();
const storage = {
  getItem: (key: string) => data.get(key) ?? null,
  setItem: (key: string, value: string) => {
    data.set(key, value);
  },
};
const events = new EventTarget();
Object.defineProperty(globalThis, 'window', {
  value: {
    localStorage: storage,
    dispatchEvent: events.dispatchEvent.bind(events),
  },
  configurable: true,
});
Object.defineProperty(globalThis, 'document', {
  value: { cookie: 'bisara_csrf=test-csrf' },
  configurable: true,
});

const users = {
  a: {
    id: 'user-a',
    email: 'a@example.com',
    displayName: 'User A',
    createdAt: '',
  },
  b: {
    id: 'user-b',
    email: 'b@example.com',
    displayName: 'User B',
    createdAt: '',
  },
};
type Remote = typeof emptyAccountProgress & {
  revision: number;
  updatedAt: string;
};
const remote = new Map<string, Remote>();
remote.set('user-a', {
  ...emptyAccountProgress,
  xp: 12,
  revision: 0,
  updatedAt: '',
});
remote.set('user-b', {
  ...emptyAccountProgress,
  xp: 20,
  revision: 0,
  updatedAt: '',
});
let signedIn: 'a' | 'b' | null = 'a';
let failure = 0;
let beforeSave: (() => void) | null = null;
const calls: { owner: string | null; body: Record<string, unknown> }[] = [];
globalThis.fetch = async (input, options) => {
  const url =
    typeof input === 'string'
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (url.endsWith('/auth/login')) {
    assert.equal(typeof options?.body, 'string');
    const payload = JSON.parse(options?.body as string) as { email: string };
    signedIn = payload.email === users.b.email ? 'b' : 'a';
    return Response.json(users[signedIn]);
  }
  if (!signedIn) return Response.json({}, { status: 401 });
  if (url.endsWith('/auth/me')) return Response.json(users[signedIn]);
  if (url.endsWith('/auth/logout')) {
    signedIn = null;
    return new Response(null, { status: 204 });
  }
  const user = users[signedIn];
  const headers = new Headers(options?.headers);
  assert.equal(headers.get('X-Progress-Owner'), user.id);
  const server = remote.get(user.id)!;
  if (options?.method !== 'PUT') return Response.json(server);
  assert.equal(typeof options.body, 'string');
  const body = JSON.parse(options.body as string) as Remote & {
    expectedRevision: number;
  };
  calls.push({ owner: headers.get('X-Progress-Owner'), body });
  if (failure) return Response.json({}, { status: failure });
  if (body.expectedRevision !== server.revision)
    return Response.json({}, { status: 409 });
  const { expectedRevision: _expectedRevision, ...fields } = body;
  const saved = { ...fields, revision: server.revision + 1, updatedAt: '' };
  remote.set(user.id, saved);
  const callback = beforeSave;
  beforeSave = null;
  callback?.();
  return Response.json(saved);
};

void test('account isolation, queued changes, conflicts, retry and expired sessions', async () => {
  writeLocal(GUEST_KEY, JSON.stringify({ ...emptyAccountProgress, xp: 555 }));
  await refreshAccount();
  assert.equal(JSON.parse(getProgressSnapshot()).xp, 12);
  assert.equal(
    JSON.parse(readLocal(GUEST_KEY)!).xp,
    555,
    'guest data was not imported',
  );

  writeScopedSnapshot(JSON.stringify({ ...emptyAccountProgress, xp: 80 }));
  beforeSave = () =>
    writeScopedSnapshot(JSON.stringify({ ...emptyAccountProgress, xp: 90 }));
  await syncProgress();
  assert.equal(
    remote.get('user-a')!.xp,
    90,
    'edit during request is retained and sent next',
  );
  assert.equal(readAccountCache('user-a')!.dirty, false);
  assert.equal(calls.length, 2);

  // A stale browser cannot overwrite changes from a different device.
  remote.get('user-a')!.revision++;
  remote.get('user-a')!.xp = 130;
  writeScopedSnapshot(JSON.stringify({ ...emptyAccountProgress, xp: 100 }));
  await syncProgress();
  assert.equal(getAccountSnapshot().sync, 'conflict');
  assert.equal(remote.get('user-a')!.xp, 130);
  await resolveProgressConflict('server');
  assert.equal(JSON.parse(getProgressSnapshot()).xp, 130);
  assert.ok(
    [...data.keys()].some((key) =>
      key.startsWith('bisara-conflict-backup:user-a:'),
    ),
  );

  failure = 503;
  writeScopedSnapshot(JSON.stringify({ ...emptyAccountProgress, xp: 150 }));
  await syncProgress();
  assert.equal(getAccountSnapshot().sync, 'pending');
  assert.equal(readAccountCache('user-a')!.dirty, true);
  failure = 0;
  await syncProgress();
  assert.equal(remote.get('user-a')!.xp, 150);
  await logoutAccount();
  assert.equal(JSON.parse(getProgressSnapshot()).xp, 555);

  await authenticate('login', {
    email: users.b.email,
    password: 'test-password',
  });
  assert.equal(JSON.parse(getProgressSnapshot()).xp, 20);
  writeScopedSnapshot(JSON.stringify({ ...emptyAccountProgress, xp: 45 }));
  failure = 401;
  await syncProgress();
  assert.equal(getAccountSnapshot().status, 'expired');
  assert.equal(getAccountSnapshot().user, null);
  assert.equal(
    readAccountCache('user-b')!.dirty,
    true,
    'pending data survives expiration',
  );
  assert.equal(remote.get('user-a')!.xp, 150);
  failure = 0;
  await authenticate('login', {
    email: users.b.email,
    password: 'test-password',
  });
  assert.equal(
    remote.get('user-b')!.xp,
    45,
    'same account restores pending data',
  );
  assert.equal(
    JSON.parse(readLocal(accountKey('user-a'))!).snapshot.includes('150'),
    true,
  );
});

import assert from 'node:assert/strict';
import { test } from 'node:test';

import { AuthError, createAuth } from '../src/index.js';

test('createAuth merges concurrent login and retries after failure', async () => {
  let calls = 0;
  const auth = createAuth({
    async authenticate() {
      calls += 1;
      if (calls === 1) throw new Error('offline');
      return { accessToken: 'token-2' };
    },
  });

  const first = auth.login();
  const concurrent = auth.login();
  assert.equal(first, concurrent);
  await assert.rejects(first, (error) => error instanceof AuthError && error.cause.message === 'offline');

  assert.deepEqual(await auth.login(), { accessToken: 'token-2' });
  assert.equal(calls, 2);
});

test('renewIfCurrent reuses a session renewed by another request', async () => {
  let refreshCalls = 0;
  const auth = createAuth({
    authenticate: async () => ({ accessToken: 'old' }),
    refresh: async () => ({ accessToken: `new-${++refreshCalls}` }),
  });

  await auth.login();
  const version = auth.getVersion();
  const [first, second] = await Promise.all([
    auth.renewIfCurrent(version),
    auth.renewIfCurrent(version),
  ]);

  assert.deepEqual(first, { accessToken: 'new-1' });
  assert.deepEqual(second, first);
  assert.equal(refreshCalls, 1);
});

test('createAuth publishes session changes and supports logout', async () => {
  const changes = [];
  const auth = createAuth({ authenticate: async () => ({ accessToken: 'token' }) });
  auth.subscribe((session, previous) => changes.push([session, previous]));

  await auth.login();
  auth.logout();

  assert.equal(auth.isAuthenticated(), false);
  assert.equal(changes.length, 2);
  assert.equal(changes[1][0], null);
});

test('logout discards an authentication result that arrives later', async () => {
  let resolveLogin;
  const auth = createAuth({
    authenticate: () => new Promise((resolve) => (resolveLogin = resolve)),
  });

  const pending = auth.login();
  await Promise.resolve();
  auth.logout();
  resolveLogin({ accessToken: 'late' });

  await assert.rejects(pending, /stale/);
  assert.equal(auth.getSession(), null);
});

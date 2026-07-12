import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { initPlatform } from '@chin0102/mp-adapter';
import { ApiError, createApiClient, createAuth } from '../src/index.js';

afterEach(() => delete globalThis.wx);

test('api client waits for login and adds authorization without mutating headers', async () => {
  const calls = [];
  globalThis.wx = {
    request(options) {
      calls.push(options);
      options.success({ statusCode: 200, data: { ok: true } });
    },
  };
  initPlatform('wx');
  const auth = createAuth({ authenticate: async () => ({ accessToken: 'secret' }) });
  const api = createApiClient({ baseURL: 'https://api.test/', auth });
  const header = { 'X-App': 'demo' };

  assert.deepEqual(
    await api.request('/users', { method: 'GET', data: { page: 1 }, header }),
    { ok: true },
  );
  assert.equal(calls[0].url, 'https://api.test/users');
  assert.equal(calls[0].header.Authorization, 'Bearer secret');
  assert.deepEqual(header, { 'X-App': 'demo' });
});

test('declarative auth collects the platform code and builds the login request', async () => {
  const calls = [];
  globalThis.wx = {
    login(options) {
      calls.push(['platform', options.timeout]);
      options.success({ code: 'wx-code', errMsg: 'login:ok' });
    },
    request(options) {
      calls.push(['request', options]);
      options.success({
        statusCode: 200,
        data: { token: { key: 'server-token' }, user: { id: 1 } },
      });
    },
  };
  initPlatform('wx');
  const auth = createAuth({
    login: {
      url: 'https://api.test/auth/mp-login',
      platform: { timeout: 3000 },
      header: { 'X-App': 'demo' },
      data: ({ code, context }) => ({ code, channel: context.channel }),
      transform: (result, { loginResult }) => ({
        accessToken: result.token.key,
        user: result.user,
        errMsg: loginResult.errMsg,
      }),
    },
  });

  assert.deepEqual(await auth.login({ channel: 2 }), {
    accessToken: 'server-token',
    user: { id: 1 },
    errMsg: 'login:ok',
  });
  assert.deepEqual(calls[0], ['platform', 3000]);
  assert.equal(calls[1][1].method, 'POST');
  assert.deepEqual(calls[1][1].data, { code: 'wx-code', channel: 2 });
  assert.equal(calls[1][1].header['X-App'], 'demo');
});

test('declarative auth supports static login data and declarative refresh', async () => {
  const requests = [];
  globalThis.wx = {
    login(options) {
      options.success({ code: 'wx-code' });
    },
    request(options) {
      requests.push(options);
      if (options.url.endsWith('/login')) {
        options.success({ statusCode: 200, data: { accessToken: 'old', refreshToken: 'refresh-1' } });
      } else {
        options.success({ statusCode: 200, data: { accessToken: 'new', refreshToken: 'refresh-2' } });
      }
    },
  };
  initPlatform('wx');
  const auth = createAuth({
    login: {
      url: 'https://api.test/login',
      data: { channel: 1 },
    },
    refresh: {
      url: 'https://api.test/refresh',
      data: ({ session }) => ({ refreshToken: session.refreshToken }),
    },
  });

  await auth.login();
  assert.deepEqual(requests[0].data, { channel: 1, code: 'wx-code' });
  assert.deepEqual(await auth.renew(), { accessToken: 'new', refreshToken: 'refresh-2' });
  assert.deepEqual(requests[1].data, { refreshToken: 'refresh-1' });
});

test('createAuth requires exactly one login strategy', () => {
  assert.throws(() => createAuth(), /exactly one/);
  assert.throws(
    () => createAuth({ login: { url: '/login' }, authenticate: async () => ({}) }),
    /exactly one/,
  );
});

test('concurrent 401 responses perform one renewal and retry once', async () => {
  let refreshCalls = 0;
  const counts = new Map();
  globalThis.wx = {
    request(options) {
      const count = (counts.get(options.url) || 0) + 1;
      counts.set(options.url, count);
      const unauthorized = options.header.Authorization === 'Bearer old';
      queueMicrotask(() =>
        options.success({
          statusCode: unauthorized ? 401 : 200,
          data: unauthorized ? {} : { url: options.url },
        }),
      );
    },
  };
  initPlatform('wx');
  const auth = createAuth({
    authenticate: async () => ({ accessToken: 'old' }),
    refresh: async () => ({ accessToken: `new-${++refreshCalls}` }),
  });
  const api = createApiClient({ baseURL: 'https://api.test', auth });

  const result = await Promise.all([api.get('/a'), api.get('/b')]);
  assert.deepEqual(result, [{ url: 'https://api.test/a' }, { url: 'https://api.test/b' }]);
  assert.equal(refreshCalls, 1);
  assert.equal(counts.get('https://api.test/a'), 2);
  assert.equal(counts.get('https://api.test/b'), 2);
});

test('upload waits for authentication and anonymous requests omit authorization', async () => {
  const calls = [];
  globalThis.wx = {
    uploadFile(options) {
      calls.push(options);
      options.success({ statusCode: 200, data: '{"url":"/avatar.png"}' });
    },
    request(options) {
      calls.push(options);
      options.success({ statusCode: 200, data: 'public' });
    },
  };
  initPlatform('wx');
  const auth = createAuth({ authenticate: async () => ({ accessToken: 'secret' }) });
  const api = createApiClient({ baseURL: 'https://api.test', auth });

  assert.deepEqual(await api.upload('/avatar', { filePath: '/tmp/a', name: 'file' }), { url: '/avatar.png' });
  assert.equal(calls[0].header.Authorization, 'Bearer secret');
  assert.equal(await api.get('/public', undefined, { auth: false }), 'public');
  assert.equal(calls[1].header.Authorization, undefined);
});

test('transformResponse can map business errors', async () => {
  globalThis.wx = {
    request(options) {
      options.success({ statusCode: 200, data: { code: 1001, message: 'invalid' } });
    },
  };
  initPlatform('wx');
  const auth = createAuth({ authenticate: async () => ({ accessToken: 'token' }) });
  const api = createApiClient({
    auth,
    transformResponse(result) {
      if (result.code !== 0) throw new ApiError(result.message, result.code, result);
      return result.data;
    },
  });

  await assert.rejects(api.get('/business'), (error) => error instanceof ApiError && error.code === 1001);
});

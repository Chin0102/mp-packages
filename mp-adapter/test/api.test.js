import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import {
  HttpError,
  authorize,
  createStorage,
  getSetting,
  getSystemInfo,
  initPlatform,
  isAuthorized,
  listenForUpdate,
  requestData,
  uploadFile,
  vibrate,
} from '../src/index.js';

afterEach(() => {
  delete globalThis.wx;
  delete globalThis.my;
});

function callbackApi(handler = (options) => options) {
  return (options = {}) => {
    try {
      options.success(handler(options));
    } catch (error) {
      options.fail(error);
    } finally {
      options.complete?.();
    }
  };
}

test('requestData validates status, transforms data, and exposes RequestTask', async () => {
  const task = { abort() {} };
  globalThis.wx = {
    request(options) {
      options.success({ statusCode: 200, data: { id: 1 }, header: {} });
      return task;
    },
  };
  initPlatform('wx');

  const pending = requestData({ url: '/users' });

  assert.equal(pending.task, task);
  assert.deepEqual(await pending, { id: 1 });
  assert.equal(await requestData({ url: '/users' }, { transform: (response) => response.statusCode }), 200);
});

test('requestData rejects non-success HTTP responses with HttpError', async () => {
  const response = { statusCode: 404, data: { message: 'missing' } };
  globalThis.wx = { request: callbackApi(() => response) };
  initPlatform('wx');

  await assert.rejects(requestData({ url: '/missing' }), (error) => {
    assert.equal(error instanceof HttpError, true);
    assert.equal(error.statusCode, 404);
    assert.equal(error.response, response);
    return true;
  });
});

test('uploadFile parses JSON response data and allows custom status validation', async () => {
  globalThis.wx = {
    uploadFile: callbackApi(() => ({ statusCode: 201, data: '{"url":"/image.png"}' })),
  };
  initPlatform('wx');

  assert.deepEqual(await uploadFile({ url: '/upload', filePath: '/tmp/a', name: 'file' }), {
    url: '/image.png',
  });
  assert.deepEqual(await uploadFile({ url: '/upload', filePath: '/tmp/a', name: 'file' }, { validateStatus: (status) => status === 201 }), {
    url: '/image.png',
  });
});

test('network helpers use overwrites to adapt platform differences', async () => {
  const nativeCalls = [];
  globalThis.my = {
    request(options) {
      nativeCalls.push(options);
      options.onSuccess({ status: 200, body: { id: 1 } });
    },
  };
  initPlatform('my', {
    request(options) {
      return globalThis.my.request({
        path: options.url,
        onSuccess(result) {
          options.success({ statusCode: result.status, data: result.body });
        },
        onFail: options.fail,
      });
    },
  });

  assert.deepEqual(await requestData({ url: '/users' }), { id: 1 });
  assert.equal(nativeCalls[0].path, '/users');
});

test('createStorage caches, patches, persists, reloads, and removes values', () => {
  const persisted = new Map();
  globalThis.wx = {
    getStorageSync: (key) => persisted.get(key) ?? '',
    setStorageSync: (key, value) => persisted.set(key, value),
    removeStorageSync: (key) => persisted.delete(key),
  };
  initPlatform('wx');

  const storage = createStorage('setting', {
    defaults: () => ({ sound: true, volume: 1 }),
  });
  const changes = [];
  const unsubscribe = storage.subscribe((value, previous) => changes.push([value, previous]));

  assert.deepEqual(storage.get(), { sound: true, volume: 1 });
  storage.patch({ volume: 0.5 });
  assert.deepEqual(persisted.get('setting'), { sound: true, volume: 0.5 });

  persisted.set('setting', { sound: false });
  assert.deepEqual(storage.reload(), { sound: false });
  assert.deepEqual(storage.remove(), { sound: true, volume: 1 });
  assert.equal(persisted.has('setting'), false);
  assert.equal(changes.length, 3);

  unsubscribe();
  storage.destroy();
  assert.throws(() => storage.get(), /destroyed/);
});

test('createStorage cancels pending writes when removed or destroyed', async () => {
  const writes = [];
  globalThis.wx = {
    getStorageSync: () => '',
    setStorageSync: (key, value) => writes.push([key, value]),
    removeStorageSync() {},
  };
  initPlatform('wx');

  const removed = createStorage('removed', { debounce: 10 });
  removed.set('value');
  removed.remove();

  const destroyed = createStorage('destroyed', { debounce: 10 });
  destroyed.set('value');
  destroyed.destroy();

  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.deepEqual(writes, []);
});

test('permission helpers cache settings, authorize once, and refresh on demand', async () => {
  let settingCalls = 0;
  let authorizeCalls = 0;
  globalThis.wx = {
    getSetting: callbackApi(() => {
      settingCalls += 1;
      return { authSetting: {} };
    }),
    authorize: callbackApi(({ scope }) => {
      authorizeCalls += 1;
      return { scope };
    }),
  };
  initPlatform('wx');

  await getSetting();
  await getSetting();
  assert.equal(settingCalls, 1);
  assert.equal(await isAuthorized('scope.camera'), false);

  await authorize('scope.camera');
  await authorize('scope.camera');
  assert.equal(authorizeCalls, 1);
  assert.equal(await isAuthorized('scope.camera'), true);

  await getSetting({ fresh: true });
  assert.equal(settingCalls, 2);
});

test('vibrate maps semantic types to short and long platform APIs', async () => {
  const calls = [];
  globalThis.wx = {
    vibrateShort: callbackApi(({ type }) => calls.push(['short', type])),
    vibrateLong: callbackApi(() => calls.push(['long'])),
  };
  initPlatform('wx');

  await vibrate('light');
  await vibrate('heavy');
  await vibrate('long');
  await assert.rejects(vibrate('unknown'), /Unknown vibration type/);
  assert.deepEqual(calls, [['short', 'light'], ['short', 'heavy'], ['long']]);
});

test('listenForUpdate registers callbacks and exposes apply and dispose', () => {
  const registered = {};
  const removed = {};
  let applied = false;
  const manager = {
    onCheckForUpdate: (listener) => (registered.check = listener),
    offCheckForUpdate: (listener) => (removed.check = listener),
    onUpdateReady: (listener) => (registered.ready = listener),
    offUpdateReady: (listener) => (removed.ready = listener),
    onUpdateFailed: (listener) => (registered.failed = listener),
    offUpdateFailed: (listener) => (removed.failed = listener),
    applyUpdate: () => (applied = true),
  };
  globalThis.wx = {
    canIUse: () => true,
    getUpdateManager: () => manager,
  };
  initPlatform('wx');

  const listeners = { onCheck() {}, onReady() {}, onFailed() {} };
  const update = listenForUpdate(listeners);
  assert.equal(update.manager, manager);
  assert.equal(registered.ready, listeners.onReady);
  update.apply();
  update.dispose();
  assert.equal(applied, true);
  assert.deepEqual(removed, {
    check: listeners.onCheck,
    ready: listeners.onReady,
    failed: listeners.onFailed,
  });
});

test('getSystemInfo returns normalized layout and environment information', () => {
  globalThis.wx = {
    getAccountInfoSync: () => ({ miniProgram: { envVersion: 'release' } }),
    getSystemInfoSync: () => ({
      system: 'iOS 18.0',
      platform: 'ios',
      screenWidth: 375,
      screenHeight: 812,
      statusBarHeight: 44,
      pixelRatio: 3,
      safeArea: { left: 0, right: 375, top: 44, bottom: 778, width: 375, height: 734 },
    }),
    getMenuButtonBoundingClientRect: () => ({ top: 48, bottom: 80, height: 32 }),
  };
  initPlatform('wx');

  const info = getSystemInfo();
  assert.equal(info.os, 'ios');
  assert.equal(info.env.prod, true);
  assert.equal(info.navigationHeight, 84);
  assert.equal(info.px2rpx, 2);
  assert.equal(info.safeBottom, 68);
});

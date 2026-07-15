import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getEnv } from '@chin0102/mp-adapter';

import { defineApp, definePage, appContext } from '../src/index.js';

test('defineApp requires a platform configuration', () => {
  assert.throws(() => defineApp({ systemInfo: {} }), /Platform is not initialized/);
});

test('defineApp initializes the adapter and exposes it through appContext', () => {
  globalThis.wx = {
    getAccountInfoSync: () => ({ miniProgram: { envVersion: 'trial' } }),
  };

  defineApp({ adapter: 'wx', systemInfo: { px2rpx: 2 } });

  assert.equal(appContext.api.getAccountInfoSync().miniProgram.envVersion, 'trial');
  assert.equal(getEnv().trial, true);
});

test('navigation chooses tab and non-tab APIs and builds query strings', () => {
  const calls = [];
  globalThis.my = {
    switchTab: (options) => calls.push(['switchTab', options]),
    navigateTo: (options) => calls.push(['nativeNavigateTo', options]),
    redirectTo: (options) => calls.push(['redirectTo', options]),
    reLaunch: (options) => calls.push(['reLaunch', options]),
    navigateBack: (options) => calls.push(['navigateBack', options]),
  };

  defineApp({
    adapter: {
      name: 'my',
      overwrites: {
        navigateTo: (options) => calls.push(['adaptedNavigateTo', options]),
      },
    },
    systemInfo: {},
    tabs: [{ pagePath: 'pages/home/index' }],
  });

  appContext.navigate('/pages/home/index', { ignored: 'for-tabs' });
  appContext.navigate('/pages/detail/index?source=home', { id: 1, tag: ['a', 'b'], skip: undefined });
  appContext.redirect('/pages/login/index', { reason: 'expired' });
  appContext.reLaunch('/pages/home/index');
  appContext.back(2);

  assert.deepEqual(calls, [
    ['switchTab', { url: '/pages/home/index' }],
    ['adaptedNavigateTo', { url: '/pages/detail/index?source=home&id=1&tag=a&tag=b' }],
    ['redirectTo', { url: '/pages/login/index?reason=expired' }],
    ['reLaunch', { url: '/pages/home/index' }],
    ['navigateBack', { delta: 2 }],
  ]);
});

test('runtime injection controls current pages and selector queries', async () => {
  const targetPage = { route: 'pages/detail/index' };
  const calls = [];
  const query = {
    select(selector) {
      calls.push(selector);
      return this;
    },
    boundingClientRect(callback) {
      this.rectCallback = callback;
      return this;
    },
    exec() {
      this.rectCallback({ left: 1, width: 10 });
    },
  };

  defineApp({
    adapter: 'my',
    systemInfo: { px2rpx: 2 },
    runtime: {
      getCurrentPages: () => [targetPage],
      createSelectorQuery: (page) => {
        assert.equal(page, targetPage);
        return query;
      },
    },
  });

  assert.equal(appContext.usePage('/pages/detail/index'), targetPage);
  await definePage({}).onReady.call(targetPage);
  assert.deepEqual(await appContext.getRect('.card', { page: targetPage }), { left: 2, width: 20 });
  assert.deepEqual(calls, ['.card']);
});

test('page unload restores context even when user and cleanup hooks fail', () => {
  const calls = [];
  defineApp({
    adapter: 'my',
    systemInfo: {},
    plugins: [
      {
        onUnload() {
          calls.push('plugin');
        },
      },
    ],
  });
  const definition = definePage({
    onUnload() {
      calls.push('user');
      throw new Error('user unload failed');
    },
  });
  const page = { route: 'pages/detail/index', setData() {} };
  definition.onLoad.call(page);
  definition.onShow.call(page);
  definition.$onCleanup.call(page, () => {
    calls.push('first cleanup');
    throw new Error('cleanup failed');
  });
  definition.$onCleanup.call(page, () => calls.push('second cleanup'));

  assert.throws(
    () => definition.onUnload.call(page),
    (error) => error.name === 'PageCleanupError' && error.errors.length === 2,
  );
  assert.deepEqual(calls, ['user', 'first cleanup', 'second cleanup', 'plugin']);
  assert.equal(appContext.current, null);
});

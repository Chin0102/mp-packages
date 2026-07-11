import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getEnv, initMP, mp } from '../src/index.js';

test('initMP requires an initialized platform', () => {
  assert.throws(() => initMP({ systemInfo: {} }), /Platform is not initialized/);
});

test('initMP can initialize the adapter and expose its API', () => {
  globalThis.wx = {
    getAccountInfoSync: () => ({ miniProgram: { envVersion: 'trial' } }),
  };

  initMP({ adapter: 'wx', systemInfo: { px2rpx: 2 } });

  assert.equal(mp.api.getAccountInfoSync().miniProgram.envVersion, 'trial');
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

  initMP({
    adapter: {
      name: 'my',
      overwrites: {
        navigateTo: (options) => calls.push(['adaptedNavigateTo', options]),
      },
    },
    systemInfo: {},
    tabs: [{ pagePath: 'pages/home/index' }],
  });

  mp.navigate('/pages/home/index', { ignored: 'for-tabs' });
  mp.navigate('/pages/detail/index?source=home', { id: 1, tag: ['a', 'b'], skip: undefined });
  mp.redirect('/pages/login/index', { reason: 'expired' });
  mp.reLaunch('/pages/home/index');
  mp.back(2);

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

  initMP({
    systemInfo: { px2rpx: 2 },
    runtime: {
      getCurrentPages: () => [targetPage],
      createSelectorQuery: (page) => {
        assert.equal(page, targetPage);
        return query;
      },
    },
  });

  assert.equal(mp.usePage('/pages/detail/index'), targetPage);
  mp.record(targetPage).ready.resolve(targetPage);
  assert.deepEqual(await mp.getRect('.card', { page: targetPage }), { left: 2, width: 20 });
  assert.deepEqual(calls, ['.card']);
});

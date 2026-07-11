import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import { getEnv, getName, initPlatform, platform } from '../src/index.js';

afterEach(() => {
  delete globalThis.wx;
  delete globalThis.my;
});

test('transparently exposes the native platform API', () => {
  globalThis.wx = {
    value: 42,
    getValue() {
      return this.value;
    },
  };

  const adapter = initPlatform('wx');

  assert.equal(getName(), 'wx');
  assert.equal(platform(), adapter);
  assert.equal(adapter.value, 42);
  assert.equal(adapter.getValue(), 42);
  assert.equal(adapter.getValue, adapter.getValue);
  assert.equal('getValue' in adapter, true);
  assert.deepEqual(Object.keys(adapter).sort(), ['getValue', 'value']);
});

test('uses overwrites before native implementations', () => {
  globalThis.my = {
    request() {
      return 'native';
    },
    untouched: true,
  };

  const adapter = initPlatform('my', {
    request() {
      return `adapted:${this.untouched}`;
    },
  });

  assert.equal(adapter.request(), 'adapted:true');
  assert.equal(adapter.untouched, true);
});

test('supports frozen overwrite definitions', () => {
  globalThis.my = { nativeApi: true };
  const adapter = initPlatform(
    'my',
    Object.freeze({
      adaptedApi: true,
    }),
  );

  assert.equal(adapter.adaptedApi, true);
  assert.equal(adapter.nativeApi, true);
  assert.deepEqual(Object.keys(adapter).sort(), ['adaptedApi', 'nativeApi']);
});

test('reads APIs added by the host after initialization', () => {
  globalThis.wx = {};
  const adapter = initPlatform('wx');

  globalThis.wx.newApi = () => 'new';

  assert.equal(adapter.newApi(), 'new');
});

test('normalizes mini program environment information', () => {
  globalThis.wx = {
    getAccountInfoSync: () => ({ miniProgram: { envVersion: 'trial' } }),
  };
  initPlatform('wx');

  assert.deepEqual(getEnv(), {
    version: 'trial',
    dev: false,
    trial: true,
    prod: false,
  });
});

test('falls back to develop when environment detection fails', () => {
  globalThis.wx = {
    getAccountInfoSync() {
      throw new Error('not available');
    },
  };
  initPlatform('wx');

  assert.deepEqual(getEnv(), {
    version: 'develop',
    dev: true,
    trial: false,
    prod: false,
  });
});

test('validates initialization arguments', () => {
  assert.throws(() => initPlatform(''), TypeError);
  assert.throws(() => initPlatform('wx', null), TypeError);
});

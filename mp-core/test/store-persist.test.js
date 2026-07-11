import assert from 'node:assert/strict';
import { test } from 'node:test';

import { initPlatform } from '@chin0102/mp-adapter';

import { defineStore } from '../src/index.js';

test('persistent stores hydrate, save changes, and flush on destroy', () => {
  const values = new Map([['setting-record', { volume: 0.5 }]]);
  globalThis.wx = {
    getStorageSync: (key) => values.get(key) ?? '',
    setStorageSync: (key, value) => values.set(key, value),
    removeStorageSync: (key) => values.delete(key),
  };
  initPlatform('wx');

  const useSetting = defineStore('persistent-setting', {
    state: () => ({ sound: true, volume: 1 }),
    persist: {
      key: 'setting-record',
      debounce: 1000,
    },
  });
  const setting = useSetting();

  assert.deepEqual(setting.state, { sound: true, volume: 0.5 });
  assert.equal(setting.$storage.name, 'setting-record');

  setting.setState({ volume: 0.25 });
  assert.deepEqual(values.get('setting-record'), { volume: 0.5 });

  setting.destroy();
  assert.deepEqual(values.get('setting-record'), { sound: true, volume: 0.25 });
  assert.equal(setting.destroyed, true);
});

test('persist true uses the store instance name as storage key', () => {
  const values = new Map();
  globalThis.wx = {
    getStorageSync: (key) => values.get(key) ?? '',
    setStorageSync: (key, value) => values.set(key, value),
    removeStorageSync: (key) => values.delete(key),
  };
  initPlatform('wx');

  const useCounter = defineStore('persistent-counter', {
    state: () => ({ count: 0 }),
    persist: true,
  });
  const counter = useCounter('counter-one');
  counter.setState({ count: 1 });

  assert.deepEqual(values.get('counter-one'), { count: 1 });
  counter.destroy();
});

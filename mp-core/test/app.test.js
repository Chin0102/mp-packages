import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';

import * as core from '../src/index.js';

const { defineApp, mp } = core;

afterEach(() => delete globalThis.wx);

test('appContext exposes a frozen runtime facade and legacy initialization APIs are private', () => {
  assert.equal(Object.isFrozen(mp), true);
  assert.equal('record' in mp, false);
  assert.equal('plugins' in mp, false);
  assert.equal('app' in mp, false);
  assert.equal('initMP' in core, false);
  assert.equal('getEnv' in core, false);
  assert.equal('getSystemInfo' in core, false);
  assert.equal('unbindStores' in core, false);
});

test('defineApp initializes the shared context and exposes launch services', async () => {
  globalThis.wx = {};
  const calls = [];
  const services = { api: { name: 'api' } };
  const plugin = {
    onAppLaunch(app, context, options) {
      calls.push(['plugin', app.name, context === mp, options.scene]);
    },
  };

  const definition = defineApp({
    adapter: 'wx',
    systemInfo: { px2rpx: 2 },
    tabs: [{ pagePath: 'pages/home/index' }],
    plugins: [plugin],
    name: 'demo',
    onLaunch(options) {
      calls.push(['app', options.scene]);
    },
    async setup(context, options) {
      calls.push(['setup', context === mp, options.scene]);
      return services;
    },
  });

  assert.equal('setup' in definition, false);
  assert.equal('tabs' in definition, false);

  const app = { name: 'instance' };
  const launch = definition.onLaunch.call(app, { scene: 1001 });
  assert.equal(mp.appStatus, 'launching');
  assert.deepEqual(calls, [
    ['plugin', 'instance', true, 1001],
    ['app', 1001],
    ['setup', true, 1001],
  ]);

  assert.equal(await launch, services);
  assert.equal(await mp.whenLaunched(), services);
  assert.equal(mp.appStatus, 'ready');
  assert.equal(mp.services, services);
  assert.equal('$appContext' in app, false);
  assert.equal('$services' in app, false);
  assert.equal('$whenLaunched' in app, false);
  assert.equal(calls.length, 3);
});

test('defineApp supports a factory and dispatches app show and hide hooks', () => {
  globalThis.wx = {};
  const calls = [];
  const definition = defineApp((context) => ({
    adapter: 'wx',
    systemInfo: {},
    plugins: [
      {
        onAppShow(app, current, options) {
          calls.push(['plugin-show', current === context, options.scene]);
        },
        onAppHide() {
          calls.push(['plugin-hide']);
        },
      },
    ],
    onShow(options) {
      calls.push(['show', options.scene]);
    },
    onHide() {
      calls.push(['hide']);
    },
  }));

  const app = {};
  definition.onShow.call(app, { scene: 1002 });
  definition.onHide.call(app);

  assert.deepEqual(calls, [['plugin-show', true, 1002], ['show', 1002], ['plugin-hide'], ['hide']]);
});

test('defineApp records setup failures and reports them through one error entry', async () => {
  globalThis.wx = {};
  const failure = new Error('cannot launch');
  const reports = [];
  const definition = defineApp({
    adapter: 'wx',
    systemInfo: {},
    plugins: [
      {
        onError(error, context) {
          reports.push(['plugin', error, context.source]);
        },
      },
    ],
    setup() {
      throw failure;
    },
    handleError(error, context) {
      reports.push(['app', error, context.source]);
    },
  });

  await assert.rejects(definition.onLaunch.call({}), failure);
  await assert.rejects(mp.whenLaunched(), failure);
  assert.equal(mp.appStatus, 'failed');
  assert.equal(mp.launchError, failure);
  assert.deepEqual(reports, [
    ['plugin', failure, 'app.launch'],
    ['app', failure, 'app.launch'],
  ]);
});

test('defineApp forwards host errors to plugins, handleError, and user callbacks', () => {
  globalThis.wx = {};
  const calls = [];
  const definition = defineApp({
    adapter: 'wx',
    systemInfo: {},
    plugins: [{ onError: (error, context) => calls.push(['plugin', error, context.source]) }],
    handleError: (error, context) => calls.push(['handler', error, context.source]),
    onError: (error) => calls.push(['user-error', error]),
    onUnhandledRejection: (event) => calls.push(['user-rejection', event.reason]),
  });

  definition.onError.call({}, 'script failed');
  const rejection = new Error('promise failed');
  definition.onUnhandledRejection.call({}, { reason: rejection });

  assert.deepEqual(calls, [
    ['plugin', 'script failed', 'app.onError'],
    ['handler', 'script failed', 'app.onError'],
    ['user-error', 'script failed'],
    ['plugin', rejection, 'app.onUnhandledRejection'],
    ['handler', rejection, 'app.onUnhandledRejection'],
    ['user-rejection', rejection],
  ]);
});

test('defineApp validates its configuration', () => {
  globalThis.wx = {};
  assert.throws(() => defineApp(), /options object/);
  assert.throws(() => defineApp({ adapter: 'wx', systemInfo: {}, setup: true }), /setup must be a function/);
  assert.throws(() => defineApp({ adapter: 'wx', systemInfo: {}, handleError: true }), /handleError must be a function/);
});

const assert = require('node:assert/strict');
const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const root = join(__dirname, '..');
const miniprogram = join(root, 'miniprogram');
const storage = new Map();

global.wx = {
  getAccountInfoSync: () => ({ miniProgram: { envVersion: 'develop' } }),
  getMenuButtonBoundingClientRect: () => ({ top: 28, right: 365, bottom: 60, left: 278, width: 87, height: 32 }),
  getStorageSync: (key) => storage.get(key),
  getSystemInfoSync: () => ({
    system: 'iOS 17',
    platform: 'devtools',
    statusBarHeight: 20,
    screenWidth: 375,
    screenHeight: 812,
    pixelRatio: 3,
    safeArea: { left: 0, right: 375, top: 44, bottom: 778, width: 375, height: 734 },
  }),
  navigateBack() {},
  navigateTo() {},
  switchTab() {},
  removeStorageSync: (key) => storage.delete(key),
  setStorageSync: (key, value) => storage.set(key, value),
};

let appDefinition;
const pageDefinitions = [];
const componentDefinitions = [];
global.App = (definition) => {
  appDefinition = definition;
};
global.Page = (definition) => {
  pageDefinitions.push(definition);
};
global.Component = (definition) => {
  componentDefinitions.push(definition);
};
global.Behavior = (definition) => definition;
global.getApp = () => appDefinition;

const tabPagePaths = ['pages/components/index', 'pages/runtime/index'];
const pagePaths = [...tabPagePaths, 'pages/toolbox/index'];
for (const pagePath of pagePaths) {
  for (const extension of ['js', 'json', 'wxml', 'wxss']) {
    assert.equal(existsSync(join(miniprogram, `${pagePath}.${extension}`)), true, `${pagePath}.${extension} is missing`);
  }
}

const appConfig = JSON.parse(readFileSync(join(miniprogram, 'app.json'), 'utf8'));
assert.deepEqual(appConfig.pages, pagePaths);
assert.equal(appConfig.tabBar.custom, true);
assert.deepEqual(
  appConfig.tabBar.list.map(({ pagePath }) => pagePath),
  tabPagePaths,
);

for (const extension of ['js', 'json', 'wxml', 'wxss']) {
  assert.equal(existsSync(join(miniprogram, `custom-tab-bar/index.${extension}`)), true, `custom tab bar ${extension} is missing`);
}

const componentsPageScript = readFileSync(join(miniprogram, 'pages/components/index.js'), 'utf8');
const runtimePageScript = readFileSync(join(miniprogram, 'pages/runtime/index.js'), 'utf8');
const toolboxPageScript = readFileSync(join(miniprogram, 'pages/toolbox/index.js'), 'utf8');
assert.doesNotMatch(componentsPageScript, /navigateTo/u);
assert.doesNotMatch(runtimePageScript, /navigateBack/u);
for (const script of [componentsPageScript, runtimePageScript, toolboxPageScript]) {
  assert.match(script, /definePage/u);
}
assert.match(runtimePageScript, /mp\.navigate/u);
assert.match(toolboxPageScript, /mp\.back/u);

const componentsConfig = JSON.parse(readFileSync(join(miniprogram, 'pages/components/index.json'), 'utf8'));
const componentMarkup = readFileSync(join(miniprogram, 'pages/components/index.wxml'), 'utf8');
const expectedComponents = ['appContext-navigation', 'appContext-page-bottom', 'appContext-countdown', 'appContext-overlay', 'appContext-popup', 'appContext-dialog'];
for (const component of expectedComponents) {
  assert.equal(
    componentsConfig.usingComponents[component],
    `@chin0102/mp-components/${component}/index`,
    `${component} is not registered from the package`,
  );
  assert.match(componentMarkup, new RegExp(`<${component}(?:\\s|>)`, 'u'), `${component} is not rendered by the example`);
}

for (const packageName of [
  '@chin0102/js-common',
  '@chin0102/appContext-adapter',
  '@chin0102/appContext-core',
  '@chin0102/appContext-components',
]) {
  assert.ok(require.resolve(packageName), `${packageName} cannot be resolved`);
}

for (const component of expectedComponents) {
  assert.ok(require.resolve(`@chin0102/mp-components/${component}/index`));
  require(`@chin0102/mp-components/${component}/index`);
}
assert.equal(componentDefinitions.length, 6);

require(join(miniprogram, 'app.js'));
require(join(miniprogram, 'custom-tab-bar/index.js'));
const { mp } = require('@chin0102/mp-core');
assert.equal(componentDefinitions.length, 7);
assert.ok(appDefinition, 'App() was not registered');

Promise.resolve(appDefinition.onLaunch.call(appDefinition, { scene: 1001 }))
  .then(() => {
    const store = mp.services.useDemoStore();
    assert.equal(store.state.count, 0);
    store.increment();
    assert.equal(store.state.count, 1);

    mp.services.preferences.patch({ theme: 'dark' });
    mp.services.preferences.flush();
    assert.equal(storage.get('appContext-example-preferences').theme, 'dark');
    return Promise.all(pagePaths.map((pagePath) => Promise.resolve().then(() => require(join(miniprogram, `${pagePath}.js`)))));
  })
  .then(async () => {
    assert.equal(pageDefinitions.length, 3);
    for (const [index, route] of tabPagePaths.entries()) {
      let selected = -1;
      pageDefinitions[index].onShow.call({
        route,
        getTabBar: () => ({
          setData: (data) => {
            selected = data.selected;
          },
        }),
      });
      assert.equal(selected, index, `${route} did not sync the custom tab bar through definePage`);
    }

    const response = await mp.services.api.get('/profile');
    assert.equal(response.path, 'https://example.invalid/profile');
    assert.equal(response.authorization, 'Bearer example-token-1');

    mp.services.auth.logout();
    const beforeConcurrent = mp.services.getRuntimeStats();
    const concurrent = await Promise.all([
      mp.services.api.get('/concurrent/one'),
      mp.services.api.get('/concurrent/two'),
      mp.services.api.get('/concurrent/three'),
    ]);
    const afterConcurrent = mp.services.getRuntimeStats();
    assert.equal(afterConcurrent.authentications - beforeConcurrent.authentications, 1);
    assert.equal(new Set(concurrent.map(({ authorization }) => authorization)).size, 1);

    const beforeRenewal = mp.services.getRuntimeStats();
    const renewed = await mp.services.api.get('/renew-profile?request=smoke');
    const afterRenewal = mp.services.getRuntimeStats();
    assert.equal(afterRenewal.unauthorizedResponses - beforeRenewal.unauthorizedResponses, 1);
    assert.equal(afterRenewal.authentications - beforeRenewal.authentications, 1);
    assert.equal(renewed.authorization, 'Bearer example-token-3');
    console.log('wechat example smoke check passed');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

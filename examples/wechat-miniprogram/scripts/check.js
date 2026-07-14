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

const pagePaths = ['pages/components/index', 'pages/runtime/index'];
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
  pagePaths,
);

for (const extension of ['js', 'json', 'wxml', 'wxss']) {
  assert.equal(existsSync(join(miniprogram, `custom-tab-bar/index.${extension}`)), true, `custom tab bar ${extension} is missing`);
}

const componentsPageScript = readFileSync(join(miniprogram, 'pages/components/index.js'), 'utf8');
const runtimePageScript = readFileSync(join(miniprogram, 'pages/runtime/index.js'), 'utf8');
assert.doesNotMatch(componentsPageScript, /navigateTo/u);
assert.doesNotMatch(runtimePageScript, /navigateBack/u);

const componentsConfig = JSON.parse(readFileSync(join(miniprogram, 'pages/components/index.json'), 'utf8'));
const componentMarkup = readFileSync(join(miniprogram, 'pages/components/index.wxml'), 'utf8');
const expectedComponents = ['mp-navigation', 'mp-page-bottom', 'mp-countdown', 'mp-overlay', 'mp-popup', 'mp-dialog'];
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
  '@chin0102/mp-adapter',
  '@chin0102/mp-core',
  '@chin0102/mp-components',
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
assert.equal(componentDefinitions.length, 7);
assert.ok(appDefinition, 'App() was not registered');

const store = appDefinition.useDemoStore();
assert.equal(store.state.count, 0);
store.increment();
assert.equal(store.state.count, 1);

appDefinition.preferences.patch({ theme: 'dark' });
appDefinition.preferences.flush();
assert.equal(storage.get('mp-example-preferences').theme, 'dark');

Promise.all(pagePaths.map((pagePath) => Promise.resolve().then(() => require(join(miniprogram, `${pagePath}.js`)))))
  .then(async () => {
    assert.equal(pageDefinitions.length, 2);
    const response = await appDefinition.api.get('/profile');
    assert.equal(response.path, 'https://example.invalid/profile');
    assert.equal(response.authorization, 'Bearer example-token');
    console.log('wechat example smoke check passed');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });

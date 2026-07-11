import { bindStore, unbindStores } from './store-bind.js';

const pageRecords = new Map();

function normalizeRoute(route = '') {
  const path = route.split('?')[0];
  return path && path.charAt(0) !== '/' ? `/${path}` : path;
}

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

export function getEnv() {
  let version = 'develop';
  try {
    version = wx.getAccountInfoSync?.().miniProgram?.envVersion || version;
  } catch (e) {}

  return {
    version,
    dev: version === 'develop',
    trial: version === 'trial',
    prod: version === 'release',
  };
}

export function getSystemInfo() {
  const info = wx.getSystemInfoSync();
  const { system = '', platform = '', statusBarHeight = 0, screenWidth = 0, screenHeight = 0, pixelRatio = 1 } = info;
  const safeArea = info.safeArea || {
    left: 0,
    right: screenWidth,
    top: 0,
    bottom: screenHeight,
    width: screenWidth,
    height: screenHeight,
  };
  const menuButton = wx.getMenuButtonBoundingClientRect?.() || {};
  const os = system.includes('iOS') ? 'ios' : 'android';
  const px2rpx = screenWidth ? 750 / screenWidth : 1;
  const navigationHeight = menuButton.bottom
    ? menuButton.bottom + (menuButton.top - statusBarHeight)
    : statusBarHeight + 44;

  return {
    ...info,
    env: getEnv(),
    os,
    isDevtools: platform === 'devtools',
    pixelRatio,
    screenWidth,
    screenHeight,
    statusBarHeight,
    navigationHeight,
    menuButton,
    safeArea,
    safeBottom: (screenHeight - safeArea.bottom) * px2rpx,
    px2rpx,
  };
}

class PageContext {
  constructor() {
    this.current = null;
    this.info = null;
    this.tabs = [];
    this.tabMap = new Map();
    this.plugins = [];
  }

  init(options = {}) {
    this.info = options.systemInfo || getSystemInfo();
    this.plugins = options.plugins || [];
    this.tabs = (options.tabs || []).map((tab, index) => ({ ...tab, index }));
    this.tabMap = new Map(this.tabs.map((tab) => [normalizeRoute(tab.pagePath), tab]));
    return this;
  }

  record(page) {
    let record = pageRecords.get(page);
    if (!record) {
      record = {
        initialized: deferred(),
        ready: deferred(),
        cleanups: [],
      };
      pageRecords.set(page, record);
    }
    return record;
  }

  setActive(page) {
    this.current = page;
    const tab = this.tabMap.get(normalizeRoute(page.route));
    if (tab) page.getTabBar?.()?.setData({ selected: tab.index });
  }

  usePage(route) {
    const normalized = normalizeRoute(route);
    const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : [];
    return pages.find((page) => normalizeRoute(page.route) === normalized);
  }

  whenReady(page = this.current) {
    return page ? this.record(page).ready.promise : Promise.resolve();
  }

  addCleanup(page, cleanup) {
    if (typeof cleanup === 'function') this.record(page).cleanups.push(cleanup);
    return cleanup;
  }

  async getRect(selector, options = {}) {
    const page = options.page || this.current;
    if (!page) return;
    await this.whenReady(page);

    return new Promise((resolve) => {
      page
        .createSelectorQuery()
        .select(selector)
        .boundingClientRect((rect) => {
          if (!rect || options.rpx === false) return resolve(rect);
          const ratio = this.info?.px2rpx || 1;
          const converted = { ...rect };
          ['left', 'right', 'top', 'bottom', 'width', 'height'].forEach((key) => {
            if (typeof converted[key] === 'number') converted[key] *= ratio;
          });
          resolve(converted);
        })
        .exec();
    });
  }

  async getCanvas(selector, page = this.current) {
    if (!page) return [undefined, undefined];
    await this.whenReady(page);
    return Promise.all([
      new Promise((resolve) => {
        page
          .createSelectorQuery()
          .select(selector)
          .node((res) => resolve(res?.node))
          .exec();
      }),
      new Promise((resolve) => {
        page.createSelectorQuery().select(selector).boundingClientRect(resolve).exec();
      }),
    ]);
  }
}

export const mp = new PageContext();

export function initMP(options) {
  return mp.init(options);
}

export function definePage(factory) {
  const pageOptions = typeof factory === 'function' ? factory(mp) : factory;
  const { onLoad, onShow, onReady, onHide, onUnload, storeBindings = {} } = pageOptions;
  const wrappedOptions = Object.assign({}, pageOptions);
  delete wrappedOptions.storeBindings;

  return Object.assign(wrappedOptions, {
    onLoad(...args) {
      const record = mp.record(this);
      record.initialized.resolve(this);

      Object.entries(storeBindings).forEach(([dataKey, binding]) => {
        const config = typeof binding === 'function' ? { store: binding() } : binding;
        const store = typeof config.store === 'function' ? config.store() : config.store;
        bindStore(this, store, config.select, dataKey);
      });

      mp.plugins.forEach((plugin) => {
        mp.addCleanup(this, plugin.onLoad?.(this, mp, ...args));
      });
      return onLoad?.apply(this, args);
    },

    onShow(...args) {
      mp.setActive(this);
      mp.plugins.forEach((plugin) => plugin.onShow?.(this, mp, ...args));
      return onShow?.apply(this, args);
    },

    onReady(...args) {
      const result = onReady?.apply(this, args);
      return Promise.resolve(result).finally(() => mp.record(this).ready.resolve(this));
    },

    onHide(...args) {
      mp.plugins.forEach((plugin) => plugin.onHide?.(this, mp, ...args));
      return onHide?.apply(this, args);
    },

    onUnload(...args) {
      const record = mp.record(this);
      let result;
      try {
        result = onUnload?.apply(this, args);
      } finally {
        unbindStores(this);
        record.cleanups.splice(0).forEach((cleanup) => cleanup());
        mp.plugins.forEach((plugin) => plugin.onUnload?.(this, mp, ...args));
        pageRecords.delete(this);
        if (mp.current === this) mp.current = null;
      }
      return result;
    },

    $onCleanup(cleanup) {
      return mp.addCleanup(this, cleanup);
    },

    $setTimeout(handler, delay) {
      const timer = setTimeout(handler, delay);
      mp.addCleanup(this, () => clearTimeout(timer));
      return timer;
    },

    $setInterval(handler, interval) {
      const timer = setInterval(handler, interval);
      mp.addCleanup(this, () => clearInterval(timer));
      return timer;
    },
  });
}

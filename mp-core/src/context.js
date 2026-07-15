import { appendQuery, deferred } from '@chin0102/js-common';
import { getSystemInfo, initPlatform, platform } from '@chin0102/mp-adapter';

function normalizeRoute(route = '') {
  const path = route.split('?')[0];
  return path && path.charAt(0) !== '/' ? `/${path}` : path;
}

class AppContext {
  constructor() {
    this.current = null;
    this.info = null;
    this.tabs = [];
    this.tabMap = new Map();
    this.plugins = [];
    this.runtime = {};
    this.pageRecords = new WeakMap();
  }

  init(options = {}) {
    if (options.adapter) {
      const adapter = typeof options.adapter === 'string' ? { name: options.adapter } : options.adapter;
      initPlatform(adapter.name, adapter.overwrites);
    }
    if (!platform()) {
      throw new Error('Platform is not initialized; pass defineApp({ adapter })');
    }
    if (options.plugins !== undefined && !Array.isArray(options.plugins)) {
      throw new TypeError('plugins must be an array');
    }
    if (options.tabs !== undefined && !Array.isArray(options.tabs)) {
      throw new TypeError('tabs must be an array');
    }

    this.info = options.systemInfo ?? getSystemInfo();
    this.plugins = options.plugins || [];
    this.runtime = {
      getCurrentPages: () => globalThis.getCurrentPages?.() || [],
      createSelectorQuery: (page) => page.createSelectorQuery(),
      ...options.runtime,
    };
    this.tabs = (options.tabs || []).map((tab, index) => ({ ...tab, index }));
    this.tabMap = new Map(this.tabs.map((tab) => [normalizeRoute(tab.pagePath), tab]));
    this.prepareApp();
    return this;
  }

  prepareApp() {
    const launched = deferred();
    launched.promise.catch(() => {});
    this.app = {
      launchOptions: undefined,
      status: 'idle',
      services: undefined,
      error: undefined,
      promise: launched.promise,
      resolve: launched.resolve,
      reject: launched.reject,
    };
    return this.app;
  }

  beginLaunch(launchOptions) {
    if (this.app.status !== 'idle') {
      throw new Error('Application launch has already started');
    }
    this.app.launchOptions = launchOptions;
    this.app.status = 'launching';
  }

  completeLaunch(services) {
    if (this.app.status !== 'launching') return services;
    this.app.services = services ?? {};
    this.app.status = 'ready';
    this.app.resolve(this.app.services);
    return this.app.services;
  }

  failLaunch(error) {
    if (this.app.status !== 'launching') return error;
    this.app.error = error;
    this.app.status = 'failed';
    this.app.reject(error);
    return error;
  }

  whenLaunched() {
    return this.app.promise;
  }

  get services() {
    return this.app.services;
  }

  get api() {
    return platform();
  }

  createQuery(page = this.current) {
    return page ? this.runtime.createSelectorQuery(page) : undefined;
  }

  record(page) {
    let record = this.pageRecords.get(page);
    if (!record) {
      record = {
        ready: deferred(),
        cleanups: [],
      };
      this.pageRecords.set(page, record);
    }
    return record;
  }

  deleteRecord(page) {
    return this.pageRecords.delete(page);
  }

  setActive(page) {
    this.current = page;
    const tab = this.tabMap.get(normalizeRoute(page.route));
    if (tab) page.getTabBar?.()?.setData({ selected: tab.index });
  }

  usePage(route) {
    const normalized = normalizeRoute(route);
    const pages = this.runtime.getCurrentPages?.() || [];
    return pages.find((page) => normalizeRoute(page.route) === normalized);
  }

  navigate(url, query, options = {}) {
    const target = appendQuery(url, query);
    const tab = this.tabMap.get(normalizeRoute(target));
    if (tab) return this.api.switchTab({ ...options, url: normalizeRoute(target) });
    return this.api.navigateTo({ ...options, url: target });
  }

  redirect(url, query, options = {}) {
    return this.api.redirectTo({ ...options, url: appendQuery(url, query) });
  }

  reLaunch(url, query, options = {}) {
    return this.api.reLaunch({ ...options, url: appendQuery(url, query) });
  }

  back(delta = 1, options = {}) {
    return this.api.navigateBack({ ...options, delta });
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
      this.createQuery(page)
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
        this.createQuery(page)
          .select(selector)
          .node((res) => resolve(res?.node))
          .exec();
      }),
      new Promise((resolve) => {
        this.createQuery(page).select(selector).boundingClientRect(resolve).exec();
      }),
    ]);
  }
}

export const context = new AppContext();

export const appContext = Object.freeze({
  get api() {
    return context.api;
  },

  get info() {
    return context.info;
  },

  get current() {
    return context.current;
  },

  get services() {
    return context.services;
  },

  get appStatus() {
    return context.app.status;
  },

  get launchOptions() {
    return context.app.launchOptions;
  },

  get launchError() {
    return context.app.error;
  },

  whenLaunched: () => context.whenLaunched(),
  whenReady: (page) => context.whenReady(page),
  usePage: (route) => context.usePage(route),
  navigate: (url, query, options) => context.navigate(url, query, options),
  redirect: (url, query, options) => context.redirect(url, query, options),
  reLaunch: (url, query, options) => context.reLaunch(url, query, options),
  back: (delta, options) => context.back(delta, options),
  getRect: (selector, options) => context.getRect(selector, options),
  getCanvas: (selector, page) => context.getCanvas(selector, page),
});

var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.js
var index_exports = {};
__export(index_exports, {
  MP_CORE_VERSION: () => MP_CORE_VERSION,
  bindStore: () => bindStore,
  definePage: () => definePage,
  defineStore: () => defineStore,
  destroyStore: () => destroyStore,
  getEnv: () => getEnv,
  getSystemInfo: () => getSystemInfo,
  hasStore: () => hasStore,
  initMP: () => initMP,
  mp: () => mp,
  readonly: () => readonly,
  unbindStores: () => unbindStores,
  useStore: () => useStore
});
module.exports = __toCommonJS(index_exports);

// src/store-bind.js
var UnsubscribersKey = "__storeUnsubscribers";
function bindStore(page, store, selector, dataKey) {
  if (!page || typeof page.setData !== "function") {
    throw new TypeError("A page or component instance with setData() is required");
  }
  if (!dataKey) throw new Error("dataKey is required");
  const select = typeof selector === "function" ? selector : (state) => state;
  const unsubscribe = store.subscribe((state) => {
    page.setData({ [dataKey]: select(state) });
  });
  if (!page[UnsubscribersKey]) page[UnsubscribersKey] = [];
  page[UnsubscribersKey].push(unsubscribe);
  return unsubscribe;
}
function unbindStores(page) {
  const unsubscribers = page == null ? void 0 : page[UnsubscribersKey];
  if (!unsubscribers) return;
  unsubscribers.forEach((unsubscribe) => unsubscribe());
  page[UnsubscribersKey] = [];
}

// src/page.js
var pageRecords = /* @__PURE__ */ new Map();
function normalizeRoute(route = "") {
  const path = route.split("?")[0];
  return path && path.charAt(0) !== "/" ? `/${path}` : path;
}
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function getEnv() {
  var _a, _b;
  let version = "develop";
  try {
    version = ((_b = (_a = wx.getAccountInfoSync) == null ? void 0 : _a.call(wx).miniProgram) == null ? void 0 : _b.envVersion) || version;
  } catch (e) {
  }
  return {
    version,
    dev: version === "develop",
    trial: version === "trial",
    prod: version === "release"
  };
}
function getSystemInfo() {
  var _a;
  const info = wx.getSystemInfoSync();
  const { system = "", platform = "", statusBarHeight = 0, screenWidth = 0, screenHeight = 0, pixelRatio = 1 } = info;
  const safeArea = info.safeArea || {
    left: 0,
    right: screenWidth,
    top: 0,
    bottom: screenHeight,
    width: screenWidth,
    height: screenHeight
  };
  const menuButton = ((_a = wx.getMenuButtonBoundingClientRect) == null ? void 0 : _a.call(wx)) || {};
  const os = system.includes("iOS") ? "ios" : "android";
  const px2rpx = screenWidth ? 750 / screenWidth : 1;
  const navigationHeight = menuButton.bottom ? menuButton.bottom + (menuButton.top - statusBarHeight) : statusBarHeight + 44;
  return {
    ...info,
    env: getEnv(),
    os,
    isDevtools: platform === "devtools",
    pixelRatio,
    screenWidth,
    screenHeight,
    statusBarHeight,
    navigationHeight,
    menuButton,
    safeArea,
    safeBottom: (screenHeight - safeArea.bottom) * px2rpx,
    px2rpx
  };
}
var PageContext = class {
  constructor() {
    this.current = null;
    this.info = null;
    this.tabs = [];
    this.tabMap = /* @__PURE__ */ new Map();
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
        cleanups: []
      };
      pageRecords.set(page, record);
    }
    return record;
  }
  setActive(page) {
    var _a, _b;
    this.current = page;
    const tab = this.tabMap.get(normalizeRoute(page.route));
    if (tab) (_b = (_a = page.getTabBar) == null ? void 0 : _a.call(page)) == null ? void 0 : _b.setData({ selected: tab.index });
  }
  usePage(route) {
    const normalized = normalizeRoute(route);
    const pages = typeof getCurrentPages === "function" ? getCurrentPages() : [];
    return pages.find((page) => normalizeRoute(page.route) === normalized);
  }
  whenReady(page = this.current) {
    return page ? this.record(page).ready.promise : Promise.resolve();
  }
  addCleanup(page, cleanup) {
    if (typeof cleanup === "function") this.record(page).cleanups.push(cleanup);
    return cleanup;
  }
  async getRect(selector, options = {}) {
    const page = options.page || this.current;
    if (!page) return;
    await this.whenReady(page);
    return new Promise((resolve) => {
      page.createSelectorQuery().select(selector).boundingClientRect((rect) => {
        var _a;
        if (!rect || options.rpx === false) return resolve(rect);
        const ratio = ((_a = this.info) == null ? void 0 : _a.px2rpx) || 1;
        const converted = { ...rect };
        ["left", "right", "top", "bottom", "width", "height"].forEach((key) => {
          if (typeof converted[key] === "number") converted[key] *= ratio;
        });
        resolve(converted);
      }).exec();
    });
  }
  async getCanvas(selector, page = this.current) {
    if (!page) return [void 0, void 0];
    await this.whenReady(page);
    return Promise.all([
      new Promise((resolve) => {
        page.createSelectorQuery().select(selector).node((res) => resolve(res == null ? void 0 : res.node)).exec();
      }),
      new Promise((resolve) => {
        page.createSelectorQuery().select(selector).boundingClientRect(resolve).exec();
      })
    ]);
  }
};
var mp = new PageContext();
function initMP(options) {
  return mp.init(options);
}
function definePage(factory) {
  const pageOptions = typeof factory === "function" ? factory(mp) : factory;
  const { onLoad, onShow, onReady, onHide, onUnload, storeBindings = {} } = pageOptions;
  const wrappedOptions = Object.assign({}, pageOptions);
  delete wrappedOptions.storeBindings;
  return Object.assign(wrappedOptions, {
    onLoad(...args) {
      const record = mp.record(this);
      record.initialized.resolve(this);
      Object.entries(storeBindings).forEach(([dataKey, binding]) => {
        const config = typeof binding === "function" ? { store: binding() } : binding;
        const store = typeof config.store === "function" ? config.store() : config.store;
        bindStore(this, store, config.select, dataKey);
      });
      mp.plugins.forEach((plugin) => {
        var _a;
        mp.addCleanup(this, (_a = plugin.onLoad) == null ? void 0 : _a.call(plugin, this, mp, ...args));
      });
      return onLoad == null ? void 0 : onLoad.apply(this, args);
    },
    onShow(...args) {
      mp.setActive(this);
      mp.plugins.forEach((plugin) => {
        var _a;
        return (_a = plugin.onShow) == null ? void 0 : _a.call(plugin, this, mp, ...args);
      });
      return onShow == null ? void 0 : onShow.apply(this, args);
    },
    onReady(...args) {
      const result = onReady == null ? void 0 : onReady.apply(this, args);
      return Promise.resolve(result).finally(() => mp.record(this).ready.resolve(this));
    },
    onHide(...args) {
      mp.plugins.forEach((plugin) => {
        var _a;
        return (_a = plugin.onHide) == null ? void 0 : _a.call(plugin, this, mp, ...args);
      });
      return onHide == null ? void 0 : onHide.apply(this, args);
    },
    onUnload(...args) {
      const record = mp.record(this);
      let result;
      try {
        result = onUnload == null ? void 0 : onUnload.apply(this, args);
      } finally {
        unbindStores(this);
        record.cleanups.splice(0).forEach((cleanup) => cleanup());
        mp.plugins.forEach((plugin) => {
          var _a;
          return (_a = plugin.onUnload) == null ? void 0 : _a.call(plugin, this, mp, ...args);
        });
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
    }
  });
}

// src/proxy.js
var cache = /* @__PURE__ */ new WeakMap();
function readonly(obj) {
  if (!obj || typeof obj !== "object") return obj;
  const cached = cache.get(obj);
  if (cached) return cached;
  const deny = () => {
    throw new TypeError("Cannot modify readonly state");
  };
  const proxy = new Proxy(obj, {
    get(target, key, receiver) {
      return readonly(Reflect.get(target, key, receiver));
    },
    set: deny,
    deleteProperty: deny,
    defineProperty: deny,
    setPrototypeOf: deny,
    preventExtensions: deny
  });
  cache.set(obj, proxy);
  return proxy;
}

// src/store.js
var definitions = /* @__PURE__ */ new Map();
var instances = /* @__PURE__ */ new Map();
function cloneState(value) {
  if (Array.isArray(value)) return value.map(cloneState);
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.keys(value).reduce((result, key) => {
      result[key] = cloneState(value[key]);
      return result;
    }, {});
  }
  if (typeof value === "function" || value && typeof value === "object") {
    throw new TypeError("Store state only supports plain objects, arrays and primitive values");
  }
  return value;
}
function createStore(name, instanceName, definition) {
  var _a;
  const listeners = /* @__PURE__ */ new Set();
  let state = cloneState(definition.state());
  let destroyed = false;
  const store = {
    $id: instanceName,
    $definition: name,
    get state() {
      return readonly(state);
    },
    setState(patch) {
      assertAlive();
      const changes = typeof patch === "function" ? patch(store.state) : patch;
      if (!changes || typeof changes !== "object") return;
      Object.keys(changes).forEach((key) => {
        state[key] = cloneState(changes[key]);
      });
      notify();
    },
    subscribe(listener, immediate = true) {
      assertAlive();
      if (typeof listener !== "function") throw new TypeError("Store listener must be a function");
      listeners.add(listener);
      if (immediate) listener(store.state);
      return () => listeners.delete(listener);
    },
    reset() {
      assertAlive();
      state = cloneState(definition.state());
      notify();
    },
    destroy() {
      var _a2;
      if (destroyed) return;
      (_a2 = definition.onDestroy) == null ? void 0 : _a2.call(store);
      destroyed = true;
      listeners.clear();
      instances.delete(instanceName);
    },
    get destroyed() {
      return destroyed;
    }
  };
  function assertAlive() {
    if (destroyed) throw new Error(`Store "${instanceName}" has been destroyed`);
  }
  function notify() {
    Array.from(listeners).forEach((listener) => listener(store.state));
  }
  Object.entries(definition.actions).forEach(([actionName, action]) => {
    if (typeof action !== "function") {
      throw new TypeError(`Action "${name}.${actionName}" must be a function`);
    }
    if (actionName in store) throw new Error(`Action name "${actionName}" is reserved`);
    store[actionName] = function(...args) {
      assertAlive();
      return action.apply(store, args);
    };
  });
  instances.set(instanceName, store);
  (_a = definition.onCreate) == null ? void 0 : _a.call(store);
  return store;
}
function defineStore(name, options = {}) {
  if (!name) throw new Error("Store name is required");
  if (definitions.has(name)) throw new Error(`Store "${name}" has already been defined`);
  const definition = {
    state: options.state || (() => ({})),
    actions: options.actions || {},
    onCreate: options.onCreate,
    onDestroy: options.onDestroy
  };
  definitions.set(name, definition);
  return (instanceName = name) => useStore(name, instanceName);
}
function useStore(name, instanceName = name) {
  const existing = instances.get(instanceName);
  if (existing) {
    if (existing.$definition !== name) {
      throw new Error(`Store instance "${instanceName}" belongs to "${existing.$definition}"`);
    }
    return existing;
  }
  const definition = definitions.get(name);
  if (!definition) throw new Error(`Store "${name}" is not defined`);
  return createStore(name, instanceName, definition);
}
function destroyStore(instanceName) {
  var _a;
  (_a = instances.get(instanceName)) == null ? void 0 : _a.destroy();
}
function hasStore(instanceName) {
  return instances.has(instanceName);
}

// src/index.js
var MP_CORE_VERSION = "0.1.1";

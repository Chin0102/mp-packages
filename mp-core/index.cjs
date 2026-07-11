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
  VERSION: () => VERSION,
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

// ../mp-adapter/src/platform.js
var info = {
  name: "",
  overwrites: {},
  adapter: null
};
var hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
function nativePlatform() {
  return globalThis[getName()];
}
function createAdapter(overwrites) {
  let boundNative;
  let boundMethods = /* @__PURE__ */ new WeakMap();
  return new Proxy(
    {},
    {
      get(target, key, receiver) {
        if (hasOwn(overwrites, key)) {
          return Reflect.get(overwrites, key, receiver);
        }
        const native = nativePlatform();
        const value = Reflect.get(native, key, native);
        if (typeof value === "function") {
          if (native !== boundNative) {
            boundNative = native;
            boundMethods = /* @__PURE__ */ new WeakMap();
          }
          if (!boundMethods.has(value)) {
            boundMethods.set(value, value.bind(native));
          }
          return boundMethods.get(value);
        }
        return value;
      },
      set(target, key, value, receiver) {
        if (hasOwn(overwrites, key)) {
          return Reflect.set(overwrites, key, value);
        }
        return Reflect.set(nativePlatform(), key, value);
      },
      has(target, key) {
        return hasOwn(overwrites, key) || key in nativePlatform();
      },
      ownKeys(target) {
        return [.../* @__PURE__ */ new Set([...Reflect.ownKeys(nativePlatform()), ...Reflect.ownKeys(overwrites)])];
      },
      getOwnPropertyDescriptor(target, key) {
        if (hasOwn(overwrites, key)) {
          const descriptor2 = Reflect.getOwnPropertyDescriptor(overwrites, key);
          return { ...descriptor2, configurable: true };
        }
        const descriptor = Reflect.getOwnPropertyDescriptor(nativePlatform(), key);
        return descriptor && { ...descriptor, configurable: true };
      }
    }
  );
}
function getName() {
  return info.name;
}
function platform() {
  if (!info.name) return void 0;
  return info.adapter;
}
function initPlatform(name, overwrites = {}) {
  if (typeof name !== "string" || !name) {
    throw new TypeError("Platform name must be a non-empty string");
  }
  if (overwrites === null || typeof overwrites !== "object") {
    throw new TypeError("Platform overwrites must be an object");
  }
  info.name = name;
  info.overwrites = overwrites;
  info.adapter = createAdapter(overwrites);
  return info.adapter;
}
function getEnv() {
  var _a, _b, _c;
  let version = "develop";
  try {
    version = ((_c = (_b = (_a = platform()).getAccountInfoSync) == null ? void 0 : _b.call(_a).miniProgram) == null ? void 0 : _c.envVersion) || version;
  } catch (e) {
  }
  return {
    version,
    dev: version === "develop",
    trial: version === "trial",
    prod: version === "release"
  };
}

// ../mp-adapter/src/storage.js
var getDefault = (defaults) => {
  const value = typeof defaults === "function" ? defaults() : defaults;
  if (Array.isArray(value)) return [...value];
  if (value && typeof value === "object") return { ...value };
  return value;
};
function createStorage(name, options = {}) {
  if (typeof name !== "string" || !name) {
    throw new TypeError("Storage name must be a non-empty string");
  }
  const { defaults, debounce = 0 } = options;
  if (!Number.isFinite(debounce) || debounce < 0) {
    throw new TypeError("Storage debounce must be a non-negative number");
  }
  let value;
  let timer;
  let destroyed = false;
  const listeners = /* @__PURE__ */ new Set();
  const ensureActive = () => {
    if (destroyed) throw new Error(`Storage "${name}" has been destroyed`);
  };
  const read = () => {
    const stored = platform().getStorageSync(name);
    return stored === void 0 || stored === "" ? getDefault(defaults) : stored;
  };
  const cancel = () => {
    if (timer !== void 0) clearTimeout(timer);
    timer = void 0;
  };
  const notify = (previous) => {
    listeners.forEach((listener) => listener(value, previous));
  };
  const flush = () => {
    ensureActive();
    cancel();
    platform().setStorageSync(name, value);
    return value;
  };
  const schedule = () => {
    cancel();
    if (debounce === 0) flush();
    else timer = setTimeout(flush, debounce);
  };
  value = read();
  return {
    get name() {
      return name;
    },
    get() {
      ensureActive();
      return value;
    },
    set(nextValue) {
      ensureActive();
      const previous = value;
      value = typeof nextValue === "function" ? nextValue(value) : nextValue;
      schedule();
      notify(previous);
      return value;
    },
    patch(partial) {
      ensureActive();
      if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new TypeError("Storage value must be an object to patch it");
      }
      return this.set({ ...value, ...partial });
    },
    reload() {
      ensureActive();
      cancel();
      const previous = value;
      value = read();
      notify(previous);
      return value;
    },
    flush,
    remove() {
      ensureActive();
      cancel();
      platform().removeStorageSync(name);
      const previous = value;
      value = getDefault(defaults);
      notify(previous);
      return value;
    },
    subscribe(listener) {
      ensureActive();
      if (typeof listener !== "function") throw new TypeError("Storage listener must be a function");
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy() {
      if (destroyed) return;
      cancel();
      listeners.clear();
      destroyed = true;
    }
  };
}

// ../mp-adapter/src/system.js
function getSystemInfo() {
  var _a;
  const api = platform();
  const info2 = api.getSystemInfoSync();
  const { system = "", platform: systemPlatform = "", statusBarHeight = 0, screenWidth = 0, screenHeight = 0, pixelRatio = 1 } = info2;
  const safeArea = info2.safeArea || {
    left: 0,
    right: screenWidth,
    top: 0,
    bottom: screenHeight,
    width: screenWidth,
    height: screenHeight
  };
  const menuButton = ((_a = api.getMenuButtonBoundingClientRect) == null ? void 0 : _a.call(api)) || {};
  const px2rpx = screenWidth ? 750 / screenWidth : 1;
  const navigationHeight = menuButton.bottom ? menuButton.bottom + (menuButton.top - statusBarHeight) : statusBarHeight + 44;
  return {
    ...info2,
    env: getEnv(),
    os: /ios/i.test(system) ? "ios" : "android",
    isDevtools: systemPlatform === "devtools",
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
function appendQuery(url, query = {}) {
  const entries = Object.entries(query).flatMap(([key, value]) => {
    if (value === void 0) return [];
    const values = Array.isArray(value) ? value : [value];
    return values.map((item) => `${encodeURIComponent(key)}=${encodeURIComponent(item != null ? item : "")}`);
  });
  if (!entries.length) return url;
  return `${url}${url.includes("?") ? "&" : "?"}${entries.join("&")}`;
}
var PageContext = class {
  constructor() {
    this.current = null;
    this.info = null;
    this.tabs = [];
    this.tabMap = /* @__PURE__ */ new Map();
    this.plugins = [];
    this.runtime = {};
  }
  init(options = {}) {
    if (options.adapter) {
      const adapter = typeof options.adapter === "string" ? { name: options.adapter } : options.adapter;
      initPlatform(adapter.name, adapter.overwrites);
    }
    if (!platform()) {
      throw new Error("Platform is not initialized; call initPlatform() or pass initMP({ adapter })");
    }
    this.info = options.systemInfo || getSystemInfo();
    this.plugins = options.plugins || [];
    this.runtime = {
      getCurrentPages: () => {
        var _a;
        return ((_a = globalThis.getCurrentPages) == null ? void 0 : _a.call(globalThis)) || [];
      },
      createSelectorQuery: (page) => page.createSelectorQuery(),
      ...options.runtime
    };
    this.tabs = (options.tabs || []).map((tab, index) => ({ ...tab, index }));
    this.tabMap = new Map(this.tabs.map((tab) => [normalizeRoute(tab.pagePath), tab]));
    return this;
  }
  get api() {
    return platform();
  }
  createQuery(page = this.current) {
    return page ? this.runtime.createSelectorQuery(page) : void 0;
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
    var _a, _b;
    const normalized = normalizeRoute(route);
    const pages = ((_b = (_a = this.runtime).getCurrentPages) == null ? void 0 : _b.call(_a)) || [];
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
    if (typeof cleanup === "function") this.record(page).cleanups.push(cleanup);
    return cleanup;
  }
  async getRect(selector, options = {}) {
    const page = options.page || this.current;
    if (!page) return;
    await this.whenReady(page);
    return new Promise((resolve) => {
      this.createQuery(page).select(selector).boundingClientRect((rect) => {
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
        this.createQuery(page).select(selector).node((res) => resolve(res == null ? void 0 : res.node)).exec();
      }),
      new Promise((resolve) => {
        this.createQuery(page).select(selector).boundingClientRect(resolve).exec();
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
  let persistence;
  let stopPersisting;
  if (definition.persist) {
    const config = definition.persist === true ? {} : typeof definition.persist === "string" ? { key: definition.persist } : definition.persist;
    const key = typeof config.key === "function" ? config.key(instanceName, name) : config.key || instanceName;
    persistence = createStorage(key, {
      defaults: () => cloneState(state),
      debounce: config.debounce
    });
    const stored = persistence.get();
    if (stored && typeof stored === "object" && !Array.isArray(stored)) {
      state = { ...state, ...cloneState(stored) };
    }
  }
  const store = {
    $id: instanceName,
    $definition: name,
    get $storage() {
      return persistence;
    },
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
      stopPersisting == null ? void 0 : stopPersisting();
      if (persistence) {
        persistence.flush();
        persistence.destroy();
      }
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
  if (persistence) {
    stopPersisting = store.subscribe((currentState) => persistence.set(cloneState(currentState)), false);
  }
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
    onDestroy: options.onDestroy,
    persist: options.persist
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
var VERSION = "0.1.1";

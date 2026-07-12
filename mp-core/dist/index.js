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
  ApiError: () => ApiError,
  AuthError: () => AuthError,
  VERSION: () => VERSION,
  bindStore: () => bindStore,
  createApiClient: () => createApiClient,
  createAuth: () => createAuth,
  definePage: () => definePage,
  defineStore: () => defineStore,
  destroyStore: () => destroyStore,
  getEnv: () => import_mp_adapter3.getEnv,
  getSystemInfo: () => import_mp_adapter3.getSystemInfo,
  hasStore: () => hasStore,
  initMP: () => initMP,
  mp: () => mp,
  readonly: () => readonly,
  unbindStores: () => unbindStores,
  useStore: () => useStore
});
module.exports = __toCommonJS(index_exports);

// src/api-client.js
var import_mp_adapter = require("@chin0102/mp-adapter");
var ApiError = class extends Error {
  constructor(message, code, data) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.data = data;
  }
};
var defaultUnauthorized = (error) => error instanceof import_mp_adapter.HttpError && error.statusCode === 401;
var identity = (value) => value;
var joinURL = (baseURL, path) => {
  if (!baseURL || /^https?:\/\//i.test(path)) return path;
  return `${baseURL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
};
function createApiClient(options = {}) {
  const {
    baseURL = "",
    auth,
    getAccessToken = (session) => session == null ? void 0 : session.accessToken,
    isUnauthorized = defaultUnauthorized,
    transformResponse = identity
  } = options;
  if (!auth || typeof auth.login !== "function" || typeof auth.renewIfCurrent !== "function") {
    throw new TypeError("auth must be created by createAuth");
  }
  if (typeof getAccessToken !== "function") throw new TypeError("getAccessToken must be a function");
  if (typeof isUnauthorized !== "function") throw new TypeError("isUnauthorized must be a function");
  if (typeof transformResponse !== "function") throw new TypeError("transformResponse must be a function");
  const buildOptions = (path, requestOptions, session) => {
    const token = session === null ? void 0 : getAccessToken(session);
    return {
      ...requestOptions,
      url: joinURL(baseURL, path),
      header: {
        ...requestOptions.header,
        ...token ? { Authorization: `Bearer ${token}` } : {}
      }
    };
  };
  const execute = async (transport, path, requestOptions = {}, config = {}) => {
    const needAuth = config.auth !== false;
    const retryAuth = config.retryAuth !== false;
    let session = needAuth ? await auth.login(config.authContext) : null;
    let sessionVersion = auth.getVersion();
    const send = () => transport(buildOptions(path, requestOptions, session), config.transport).then(
      (data) => transformResponse(data, { path, requestOptions })
    );
    try {
      return await send();
    } catch (error) {
      if (!needAuth || !retryAuth || !isUnauthorized(error)) throw error;
      session = await auth.renewIfCurrent(sessionVersion, config.authContext);
      sessionVersion = auth.getVersion();
      return send();
    }
  };
  const request = (path, requestOptions, config) => execute(import_mp_adapter.requestData, path, requestOptions, config);
  return {
    request,
    upload(path, uploadOptions, config) {
      return execute(import_mp_adapter.uploadFile, path, uploadOptions, config);
    },
    get(path, data, config) {
      return request(path, { method: "GET", data }, config);
    },
    post(path, data, config) {
      return request(path, { method: "POST", data }, config);
    },
    put(path, data, config) {
      return request(path, { method: "PUT", data }, config);
    },
    patch(path, data, config) {
      return request(path, { method: "PATCH", data }, config);
    },
    delete(path, data, config) {
      return request(path, { method: "DELETE", data }, config);
    }
  };
}

// src/auth.js
var import_mp_adapter2 = require("@chin0102/mp-adapter");
var AuthError = class extends Error {
  constructor(message, options = {}) {
    super(message, options.cause === void 0 ? void 0 : { cause: options.cause });
    this.name = "AuthError";
    this.cause = options.cause;
  }
};
function createAuth(options = {}) {
  var _a;
  const { login: loginConfig, authenticate, refresh, onSessionChange } = options;
  const customAuthenticate = typeof authenticate === "function";
  const configuredLogin = loginConfig !== void 0;
  if (customAuthenticate === configuredLogin) {
    throw new TypeError("Provide exactly one of login or authenticate");
  }
  if (configuredLogin && (!loginConfig || typeof loginConfig !== "object")) {
    throw new TypeError("login must be an object");
  }
  if (configuredLogin && (typeof loginConfig.url !== "string" || !loginConfig.url)) {
    throw new TypeError("login.url must be a non-empty string");
  }
  if (authenticate !== void 0 && !customAuthenticate) {
    throw new TypeError("authenticate must be a function");
  }
  if (refresh !== void 0 && typeof refresh !== "function" && (!refresh || typeof refresh !== "object")) {
    throw new TypeError("refresh must be a function or an object");
  }
  if (refresh && typeof refresh === "object" && (typeof refresh.url !== "string" || !refresh.url)) {
    throw new TypeError("refresh.url must be a non-empty string");
  }
  if (onSessionChange !== void 0 && typeof onSessionChange !== "function") {
    throw new TypeError("onSessionChange must be a function");
  }
  let session = (_a = options.initialSession) != null ? _a : null;
  let version = 0;
  let pending = null;
  const listeners = /* @__PURE__ */ new Set();
  const requestSession = async (config, input) => {
    const { data, transform, transport, ...requestOptions } = config;
    const requestDataValue = typeof data === "function" ? await data(input) : data;
    const response = await (0, import_mp_adapter2.requestData)(
      {
        method: "POST",
        ...requestOptions,
        data: requestDataValue
      },
      transport
    );
    return typeof transform === "function" ? transform(response, input) : response;
  };
  const performLogin = customAuthenticate ? authenticate : async (context) => {
    const { platform: platformOptions, data, ...requestConfig } = loginConfig;
    const loginResult = await (0, import_mp_adapter2.login)(platformOptions);
    if (!(loginResult == null ? void 0 : loginResult.code)) {
      throw new AuthError("Platform login did not return a code");
    }
    const input = { code: loginResult.code, loginResult, context };
    return requestSession(
      {
        ...requestConfig,
        data: typeof data === "function" ? data : { ...data || {}, code: loginResult.code }
      },
      input
    );
  };
  const performRefresh = (current, context) => {
    if (typeof refresh === "function") return refresh(current, context);
    if (refresh) return requestSession(refresh, { session: current, context });
    return performLogin(context);
  };
  const updateSession = (nextSession) => {
    if (nextSession == null) throw new AuthError("Authentication returned an empty session");
    const previous = session;
    session = nextSession;
    version += 1;
    onSessionChange == null ? void 0 : onSessionChange(session, previous);
    listeners.forEach((listener) => listener(session, previous));
    return session;
  };
  const clear = () => {
    version += 1;
    if (session === null) return;
    const previous = session;
    session = null;
    onSessionChange == null ? void 0 : onSessionChange(null, previous);
    listeners.forEach((listener) => listener(null, previous));
  };
  const run = (operation) => {
    if (pending) return pending;
    const operationVersion = version;
    pending = Promise.resolve().then(operation).then((nextSession) => {
      if (operationVersion !== version) {
        throw new AuthError("Authentication result is stale");
      }
      return updateSession(nextSession);
    }).catch((error) => {
      throw error instanceof AuthError ? error : new AuthError("Authentication failed", { cause: error });
    }).finally(() => {
      pending = null;
    });
    return pending;
  };
  const login = (context = {}, config = {}) => {
    if (session !== null && !config.force) return Promise.resolve(session);
    return run(() => performLogin(context));
  };
  const renew = (context = {}) => {
    const current = session;
    return run(() => current === null ? performLogin(context) : performRefresh(current, context));
  };
  const renewIfCurrent = (expectedVersion, context = {}) => {
    if (expectedVersion !== version && session !== null) return Promise.resolve(session);
    return renew(context);
  };
  return {
    login,
    renew,
    renewIfCurrent,
    logout: clear,
    getSession() {
      return session;
    },
    getVersion() {
      return version;
    },
    isAuthenticated() {
      return session !== null;
    },
    subscribe(listener) {
      if (typeof listener !== "function") throw new TypeError("listener must be a function");
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}

// src/page.js
var import_mp_adapter3 = require("@chin0102/mp-adapter");

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
      (0, import_mp_adapter3.initPlatform)(adapter.name, adapter.overwrites);
    }
    if (!(0, import_mp_adapter3.platform)()) {
      throw new Error("Platform is not initialized; call initPlatform() or pass initMP({ adapter })");
    }
    this.info = options.systemInfo || (0, import_mp_adapter3.getSystemInfo)();
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
    return (0, import_mp_adapter3.platform)();
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
var import_mp_adapter4 = require("@chin0102/mp-adapter");
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
    persistence = (0, import_mp_adapter4.createStorage)(key, {
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

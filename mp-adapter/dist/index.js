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
  HttpError: () => HttpError,
  VERSION: () => VERSION,
  authorize: () => authorize,
  createStorage: () => createStorage,
  getEnv: () => getEnv,
  getName: () => getName,
  getSetting: () => getSetting,
  getSystemInfo: () => getSystemInfo,
  initPlatform: () => initPlatform,
  isAuthorized: () => isAuthorized,
  listenForUpdate: () => listenForUpdate,
  platform: () => platform,
  requestData: () => requestData,
  uploadFile: () => uploadFile,
  vibrate: () => vibrate
});
module.exports = __toCommonJS(index_exports);

// src/platform.js
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

// src/invoke.js
function invoke(api, options = {}) {
  var _a;
  const method = (_a = platform()) == null ? void 0 : _a[api];
  if (typeof method !== "function") {
    return Promise.reject(new Error(`Platform API "${api}" is not available`));
  }
  const { success, fail, ...params } = options;
  let task;
  const promise = new Promise((resolve, reject) => {
    try {
      task = method({
        ...params,
        success(result) {
          resolve(result);
          success == null ? void 0 : success(result);
        },
        fail(error) {
          reject(error);
          fail == null ? void 0 : fail(error);
        }
      });
    } catch (error) {
      reject(error);
    }
  });
  Object.defineProperty(promise, "task", {
    enumerable: true,
    get: () => task
  });
  return promise;
}
function mapResult(promise, transform) {
  const mapped = promise.then(transform);
  Object.defineProperty(mapped, "task", {
    enumerable: true,
    get: () => promise.task
  });
  return mapped;
}

// src/device.js
var shortTypes = /* @__PURE__ */ new Set(["light", "medium", "heavy"]);
function vibrate(type = "medium") {
  if (type === "long") return invoke("vibrateLong");
  if (!shortTypes.has(type)) {
    return Promise.reject(new TypeError(`Unknown vibration type "${type}"`));
  }
  return invoke("vibrateShort", { type });
}

// src/network.js
var defaultValidateStatus = (status) => status >= 200 && status < 300;
var defaultTransform = (response) => response.data;
var HttpError = class extends Error {
  constructor(response) {
    super(`Request failed with status ${response.statusCode}`);
    this.name = "HttpError";
    this.statusCode = response.statusCode;
    this.response = response;
  }
};
function requestData(options, config = {}) {
  const validateStatus = config.validateStatus || defaultValidateStatus;
  const transform = config.transform || defaultTransform;
  return mapResult(invoke("request", options), (response) => {
    if (!validateStatus(response.statusCode, response)) {
      throw new HttpError(response);
    }
    return transform(response);
  });
}
function uploadFile(options, config = {}) {
  const validateStatus = config.validateStatus || defaultValidateStatus;
  const transform = config.transform || defaultTransform;
  return mapResult(invoke("uploadFile", options), (response) => {
    if (!validateStatus(response.statusCode, response)) {
      throw new HttpError(response);
    }
    let data = response.data;
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch (error) {
      }
    }
    return transform({ ...response, data });
  });
}

// src/permission.js
var settingCache;
var settingPlatform;
function getSetting(options = {}) {
  const currentPlatform = platform();
  if (settingPlatform !== currentPlatform) {
    settingPlatform = currentPlatform;
    settingCache = void 0;
  }
  if (options.fresh || !settingCache) {
    const { fresh, ...apiOptions } = options;
    const pending = invoke("getSetting", apiOptions);
    const cached = pending.catch((error) => {
      if (settingCache === cached) settingCache = void 0;
      throw error;
    });
    settingCache = cached;
  }
  return settingCache;
}
async function isAuthorized(scope, options = {}) {
  var _a;
  const setting = await getSetting(options);
  return ((_a = setting.authSetting) == null ? void 0 : _a[scope]) === true;
}
async function authorize(scope) {
  if (await isAuthorized(scope)) return;
  await invoke("authorize", { scope });
  settingCache = mapResult(Promise.resolve(settingCache), (setting) => ({
    ...setting,
    authSetting: { ...setting.authSetting, [scope]: true }
  }));
}

// src/storage.js
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

// src/system.js
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

// src/update.js
function listenForUpdate(options = {}) {
  var _a;
  const api = platform();
  if (api.canIUse && !api.canIUse("getUpdateManager")) return null;
  const manager = (_a = api.getUpdateManager) == null ? void 0 : _a.call(api);
  if (!manager) return null;
  const listeners = [
    ["onCheckForUpdate", "offCheckForUpdate", options.onCheck],
    ["onUpdateReady", "offUpdateReady", options.onReady],
    ["onUpdateFailed", "offUpdateFailed", options.onFailed]
  ];
  listeners.forEach(([on, , listener]) => {
    var _a2;
    if (listener) (_a2 = manager[on]) == null ? void 0 : _a2.call(manager, listener);
  });
  return {
    manager,
    apply: () => manager.applyUpdate(),
    dispose() {
      listeners.forEach(([, off, listener]) => {
        var _a2;
        if (listener) (_a2 = manager[off]) == null ? void 0 : _a2.call(manager, listener);
      });
    }
  };
}

// src/index.js
var VERSION = "0.1.0";

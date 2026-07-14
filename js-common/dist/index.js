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
  appendQuery: () => appendQuery,
  compactDefined: () => compactDefined,
  compareBy: () => compareBy,
  compareByKey: () => compareByKey,
  createEmitter: () => createEmitter,
  debounce: () => debounce,
  deferred: () => deferred,
  delay: () => delay,
  memoizeAsync: () => memoizeAsync,
  parseQuery: () => parseQuery,
  randomInt: () => randomInt,
  readonly: () => readonly,
  sample: () => sample,
  sampleSize: () => sampleSize,
  settle: () => settle,
  stringifyQuery: () => stringifyQuery,
  throttle: () => throttle
});
module.exports = __toCommonJS(index_exports);

// src/async.js
function normalizeDuration(value, fallback) {
  if (value === Infinity) return value;
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}
async function settle(value) {
  try {
    return {
      ok: true,
      value: await (typeof value === "function" ? value() : value),
      error: void 0
    };
  } catch (error) {
    return {
      ok: false,
      value: void 0,
      error
    };
  }
}
function delay(duration = 0, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), normalizeDuration(duration, 0)));
}
function memoizeAsync(handler, options = {}) {
  if (typeof handler !== "function") throw new TypeError("memoizeAsync handler must be a function");
  const ttl = normalizeDuration(options.ttl, Infinity);
  const cacheRejected = options.cacheRejected === true;
  const keyResolver = options.key;
  const now = options.now || Date.now;
  if (keyResolver !== void 0 && typeof keyResolver !== "function") {
    throw new TypeError("memoizeAsync key must be a function");
  }
  if (typeof now !== "function") throw new TypeError("memoizeAsync now must be a function");
  const root = createCacheNode();
  function resolveKeys(args) {
    return keyResolver ? [keyResolver(...args)] : args;
  }
  function findNode(keys, create = false) {
    let node = root;
    const path = [];
    for (const key of keys) {
      let child = node.children.get(key);
      if (!child) {
        if (!create) return { node: void 0, path };
        child = createCacheNode();
        node.children.set(key, child);
      }
      path.push({ parent: node, key, node: child });
      node = child;
    }
    return { node, path };
  }
  function removeEntry(node, path) {
    node.entry = void 0;
    for (let index = path.length - 1; index >= 0; index -= 1) {
      const current = path[index];
      if (current.node.entry || current.node.children.size) break;
      current.parent.children.delete(current.key);
    }
  }
  function memoized(...args) {
    const keys = resolveKeys(args);
    const { node, path } = findNode(keys, true);
    const current = node.entry;
    const timestamp = now();
    if (current && (current.pending || current.expiresAt > timestamp)) return current.promise;
    if (current) node.entry = void 0;
    const entry = {
      pending: true,
      expiresAt: Infinity,
      promise: void 0
    };
    node.entry = entry;
    entry.promise = Promise.resolve().then(() => handler(...args)).then(
      (value) => {
        entry.pending = false;
        entry.expiresAt = ttl === Infinity ? Infinity : now() + ttl;
        return value;
      },
      (error) => {
        entry.pending = false;
        if (cacheRejected) entry.expiresAt = ttl === Infinity ? Infinity : now() + ttl;
        else if (node.entry === entry) removeEntry(node, path);
        throw error;
      }
    );
    return entry.promise;
  }
  memoized.invalidate = (...args) => {
    const { node, path } = findNode(resolveKeys(args));
    if (!(node == null ? void 0 : node.entry)) return false;
    removeEntry(node, path);
    return true;
  };
  memoized.refresh = (...args) => {
    memoized.invalidate(...args);
    return memoized(...args);
  };
  memoized.clear = () => {
    root.entry = void 0;
    root.children.clear();
  };
  return memoized;
}
function createCacheNode() {
  return {
    children: /* @__PURE__ */ new Map(),
    entry: void 0
  };
}

// src/collection.js
function assertArray(value) {
  if (!Array.isArray(value)) throw new TypeError("Expected an array");
}
function nextRandom(random) {
  if (typeof random !== "function") throw new TypeError("random must be a function");
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("random must return a number in the range [0, 1)");
  }
  return value;
}
function randomInt(min, max, random = Math.random) {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) {
    throw new TypeError("min and max must be safe integers");
  }
  if (min > max) throw new RangeError("min must be less than or equal to max");
  const range = max - min + 1;
  if (!Number.isSafeInteger(range) || range <= 0) {
    throw new RangeError("The integer range is too large");
  }
  return min + Math.floor(nextRandom(random) * range);
}
function sample(array, random = Math.random) {
  assertArray(array);
  if (array.length === 0) return void 0;
  return array[Math.floor(nextRandom(random) * array.length)];
}
function sampleSize(array, count, random = Math.random) {
  assertArray(array);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new TypeError("count must be a non-negative safe integer");
  }
  const size = Math.min(count, array.length);
  if (size === 0) return [];
  const copy = array.slice();
  for (let index = 0; index < size; index += 1) {
    const selected = index + Math.floor(nextRandom(random) * (copy.length - index));
    [copy[index], copy[selected]] = [copy[selected], copy[index]];
  }
  return copy.slice(0, size);
}
function defaultCompare(left, right) {
  if (Object.is(left, right)) return 0;
  if (typeof left === "string" && typeof right === "string") return left.localeCompare(right);
  return left < right ? -1 : 1;
}
function compareBy(selector = (value) => value, options = {}) {
  if (typeof selector !== "function") throw new TypeError("selector must be a function");
  if (options === null || typeof options !== "object") throw new TypeError("options must be an object");
  const { descending = false, nulls = "last", compare = defaultCompare } = options;
  if (typeof compare !== "function") throw new TypeError("compare must be a function");
  if (nulls !== "first" && nulls !== "last") throw new TypeError('nulls must be "first" or "last"');
  return (left, right) => {
    const leftValue = selector(left);
    const rightValue = selector(right);
    const leftNull = leftValue == null;
    const rightNull = rightValue == null;
    if (leftNull || rightNull) {
      if (leftNull && rightNull) return 0;
      return leftNull === (nulls === "first") ? -1 : 1;
    }
    const result = compare(leftValue, rightValue);
    if (!Number.isFinite(result)) throw new TypeError("compare must return a finite number");
    if (result === 0) return 0;
    const normalized = result < 0 ? -1 : 1;
    return descending ? -normalized : normalized;
  };
}
function compareByKey(key, options) {
  return compareBy((value) => value == null ? void 0 : value[key], options);
}

// src/event.js
function createEmitter() {
  const listeners = /* @__PURE__ */ new Map();
  function on(type, handler) {
    if (typeof handler !== "function") throw new TypeError("Event handler must be a function");
    let handlers = listeners.get(type);
    if (!handlers) {
      handlers = /* @__PURE__ */ new Set();
      listeners.set(type, handlers);
    }
    handlers.add(handler);
    return () => off(type, handler);
  }
  function once(type, handler) {
    if (typeof handler !== "function") throw new TypeError("Event handler must be a function");
    let unsubscribe;
    const wrapped = (...args) => {
      unsubscribe();
      return handler(...args);
    };
    unsubscribe = on(type, wrapped);
    return unsubscribe;
  }
  function off(type, handler) {
    const handlers = listeners.get(type);
    if (!handlers) return false;
    const removed = handlers.delete(handler);
    if (!handlers.size) listeners.delete(type);
    return removed;
  }
  function emit(type, ...args) {
    const handlers = listeners.get(type);
    if (!handlers) return 0;
    const snapshot = Array.from(handlers);
    snapshot.forEach((handler) => handler(...args));
    return snapshot.length;
  }
  function clear(type) {
    if (arguments.length) return listeners.delete(type);
    listeners.clear();
    return true;
  }
  function listenerCount(type) {
    var _a;
    return ((_a = listeners.get(type)) == null ? void 0 : _a.size) || 0;
  }
  return {
    on,
    once,
    off,
    emit,
    clear,
    listenerCount
  };
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

// src/timing.js
function normalizeWait(value) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}
function debounce(handler, wait = 0, options = {}) {
  if (typeof handler !== "function") throw new TypeError("debounce handler must be a function");
  wait = normalizeWait(wait);
  const leading = options.leading === true;
  const trailing = options.trailing !== false;
  let timer;
  let lastArgs;
  let lastThis;
  let result;
  let trailingPending = false;
  function invoke() {
    const args = lastArgs;
    const context = lastThis;
    lastArgs = void 0;
    lastThis = void 0;
    trailingPending = false;
    result = handler.apply(context, args);
    return result;
  }
  function timerExpired() {
    timer = void 0;
    if (trailing && trailingPending && lastArgs) invoke();
    else {
      lastArgs = void 0;
      lastThis = void 0;
      trailingPending = false;
    }
  }
  function debounced(...args) {
    const hasTimer = timer !== void 0;
    lastArgs = args;
    lastThis = this;
    trailingPending = hasTimer || !leading;
    if (hasTimer) clearTimeout(timer);
    timer = setTimeout(timerExpired, wait);
    if (leading && !hasTimer) return invoke();
    return result;
  }
  debounced.cancel = () => {
    if (timer !== void 0) clearTimeout(timer);
    timer = void 0;
    lastArgs = void 0;
    lastThis = void 0;
    trailingPending = false;
  };
  debounced.flush = () => {
    if (timer === void 0) return result;
    clearTimeout(timer);
    timer = void 0;
    if (trailing && trailingPending && lastArgs) return invoke();
    lastArgs = void 0;
    lastThis = void 0;
    trailingPending = false;
    return result;
  };
  debounced.pending = () => timer !== void 0;
  return debounced;
}
function throttle(handler, wait = 0, options = {}) {
  if (typeof handler !== "function") throw new TypeError("throttle handler must be a function");
  wait = normalizeWait(wait);
  const leading = options.leading !== false;
  const trailing = options.trailing !== false;
  let timer;
  let lastInvokeTime = 0;
  let lastArgs;
  let lastThis;
  let result;
  function invoke(timestamp) {
    const args = lastArgs;
    const context = lastThis;
    lastArgs = void 0;
    lastThis = void 0;
    lastInvokeTime = timestamp;
    result = handler.apply(context, args);
    return result;
  }
  function timerExpired() {
    timer = void 0;
    if (trailing && lastArgs) invoke(Date.now());
    else {
      lastArgs = void 0;
      lastThis = void 0;
      lastInvokeTime = 0;
    }
  }
  function throttled(...args) {
    if (!leading && !trailing) return result;
    const timestamp = Date.now();
    if (!lastInvokeTime && !leading) lastInvokeTime = timestamp;
    const remaining = wait - (timestamp - lastInvokeTime);
    lastArgs = args;
    lastThis = this;
    if (remaining <= 0 || remaining > wait) {
      if (timer !== void 0) clearTimeout(timer);
      timer = void 0;
      return invoke(timestamp);
    }
    if (timer === void 0 && trailing) timer = setTimeout(timerExpired, remaining);
    return result;
  }
  throttled.cancel = () => {
    if (timer !== void 0) clearTimeout(timer);
    timer = void 0;
    lastInvokeTime = 0;
    lastArgs = void 0;
    lastThis = void 0;
  };
  throttled.flush = () => {
    if (timer === void 0) return result;
    clearTimeout(timer);
    timer = void 0;
    return lastArgs ? invoke(Date.now()) : result;
  };
  throttled.pending = () => timer !== void 0;
  return throttled;
}

// src/url.js
function decode(value) {
  const normalized = String(value).replace(/\+/g, " ");
  try {
    return decodeURIComponent(normalized);
  } catch (e) {
    return normalized;
  }
}
function stringifyQuery(query = {}) {
  return Object.entries(query).flatMap(([key, value]) => {
    if (value === void 0) return [];
    const values = Array.isArray(value) ? value : [value];
    return values.map((item) => `${encodeURIComponent(key)}=${encodeURIComponent(item != null ? item : "")}`);
  }).join("&");
}
function appendQuery(url, query = {}) {
  const queryString = stringifyQuery(query);
  if (!queryString) return url;
  const hashIndex = url.indexOf("#");
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
  const base = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const separator = base.includes("?") ? base.endsWith("?") || base.endsWith("&") ? "" : "&" : "?";
  return `${base}${separator}${queryString}${hash}`;
}
function parseQuery(input = "") {
  let query = String(input);
  const questionIndex = query.indexOf("?");
  if (questionIndex >= 0) query = query.slice(questionIndex + 1);
  if (query.startsWith("?")) query = query.slice(1);
  const hashIndex = query.indexOf("#");
  if (hashIndex >= 0) query = query.slice(0, hashIndex);
  const result = {};
  if (!query) return result;
  query.split("&").forEach((part) => {
    if (!part) return;
    const separatorIndex = part.indexOf("=");
    const key = decode(separatorIndex >= 0 ? part.slice(0, separatorIndex) : part);
    const value = decode(separatorIndex >= 0 ? part.slice(separatorIndex + 1) : "");
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      const current = result[key];
      result[key] = Array.isArray(current) ? [...current, value] : [current, value];
    } else {
      Object.defineProperty(result, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value
      });
    }
  });
  return result;
}
function compactDefined(value = {}) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== void 0));
}

// src/index.js
var VERSION = "0.1.1";

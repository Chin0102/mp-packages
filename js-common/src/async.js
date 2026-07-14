function normalizeDuration(value, fallback) {
  if (value === Infinity) return value;
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

export function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

export async function settle(value) {
  try {
    return {
      ok: true,
      value: await (typeof value === 'function' ? value() : value),
      error: undefined,
    };
  } catch (error) {
    return {
      ok: false,
      value: undefined,
      error,
    };
  }
}

export function delay(duration = 0, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), normalizeDuration(duration, 0)));
}

export function memoizeAsync(handler, options = {}) {
  if (typeof handler !== 'function') throw new TypeError('memoizeAsync handler must be a function');

  const ttl = normalizeDuration(options.ttl, Infinity);
  const cacheRejected = options.cacheRejected === true;
  const keyResolver = options.key;
  const now = options.now || Date.now;
  if (keyResolver !== undefined && typeof keyResolver !== 'function') {
    throw new TypeError('memoizeAsync key must be a function');
  }
  if (typeof now !== 'function') throw new TypeError('memoizeAsync now must be a function');

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
        if (!create) return { node: undefined, path };
        child = createCacheNode();
        node.children.set(key, child);
      }
      path.push({ parent: node, key, node: child });
      node = child;
    }
    return { node, path };
  }

  function removeEntry(node, path) {
    node.entry = undefined;
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
    if (current) node.entry = undefined;

    const entry = {
      pending: true,
      expiresAt: Infinity,
      promise: undefined,
    };
    node.entry = entry;

    entry.promise = Promise.resolve()
      .then(() => handler(...args))
      .then(
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
        },
      );

    return entry.promise;
  }

  memoized.invalidate = (...args) => {
    const { node, path } = findNode(resolveKeys(args));
    if (!node?.entry) return false;
    removeEntry(node, path);
    return true;
  };

  memoized.refresh = (...args) => {
    memoized.invalidate(...args);
    return memoized(...args);
  };

  memoized.clear = () => {
    root.entry = undefined;
    root.children.clear();
  };

  return memoized;
}

function createCacheNode() {
  return {
    children: new Map(),
    entry: undefined,
  };
}

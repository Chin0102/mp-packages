import { platform } from './platform.js';

const getDefault = (defaults) => {
  const value = typeof defaults === 'function' ? defaults() : defaults;
  if (Array.isArray(value)) return [...value];
  if (value && typeof value === 'object') return { ...value };
  return value;
};

export function createStorage(name, options = {}) {
  if (typeof name !== 'string' || !name) {
    throw new TypeError('Storage name must be a non-empty string');
  }

  const { defaults, debounce = 0 } = options;
  if (!Number.isFinite(debounce) || debounce < 0) {
    throw new TypeError('Storage debounce must be a non-negative number');
  }

  let value;
  let timer;
  let destroyed = false;
  const listeners = new Set();

  const ensureActive = () => {
    if (destroyed) throw new Error(`Storage "${name}" has been destroyed`);
  };

  const read = () => {
    const stored = platform().getStorageSync(name);
    return stored === undefined || stored === '' ? getDefault(defaults) : stored;
  };

  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
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
      value = typeof nextValue === 'function' ? nextValue(value) : nextValue;
      schedule();
      notify(previous);
      return value;
    },

    patch(partial) {
      ensureActive();
      if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new TypeError('Storage value must be an object to patch it');
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
      if (typeof listener !== 'function') throw new TypeError('Storage listener must be a function');
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    destroy() {
      if (destroyed) return;
      cancel();
      listeners.clear();
      destroyed = true;
    },
  };
}

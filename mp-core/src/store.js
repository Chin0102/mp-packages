import { createStorage } from '@chin0102/mp-adapter';

import { readonly } from './proxy.js';

const definitions = new Map();
const instances = new Map();

function cloneState(value) {
  if (Array.isArray(value)) return value.map(cloneState);
  if (value && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.keys(value).reduce((result, key) => {
      result[key] = cloneState(value[key]);
      return result;
    }, {});
  }
  if (typeof value === 'function' || (value && typeof value === 'object')) {
    throw new TypeError('Store state only supports plain objects, arrays and primitive values');
  }
  return value;
}

function createStore(name, instanceName, definition) {
  const listeners = new Set();
  let state = cloneState(definition.state());
  let destroyed = false;
  let persistence;
  let stopPersisting;

  if (definition.persist) {
    const config = definition.persist === true ? {} : typeof definition.persist === 'string' ? { key: definition.persist } : definition.persist;
    const key = typeof config.key === 'function' ? config.key(instanceName, name) : config.key || instanceName;
    persistence = createStorage(key, {
      defaults: () => cloneState(state),
      debounce: config.debounce,
    });
    const stored = persistence.get();
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
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
      const changes = typeof patch === 'function' ? patch(store.state) : patch;
      if (!changes || typeof changes !== 'object') return;

      Object.keys(changes).forEach((key) => {
        state[key] = cloneState(changes[key]);
      });
      notify();
    },

    subscribe(listener, immediate = true) {
      assertAlive();
      if (typeof listener !== 'function') throw new TypeError('Store listener must be a function');

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
      if (destroyed) return;

      definition.onDestroy?.call(store);
      stopPersisting?.();
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
    },
  };

  function assertAlive() {
    if (destroyed) throw new Error(`Store "${instanceName}" has been destroyed`);
  }

  function notify() {
    // 使用快照，避免监听器在回调中退订时干扰本轮通知。
    Array.from(listeners).forEach((listener) => listener(store.state));
  }

  Object.entries(definition.actions).forEach(([actionName, action]) => {
    if (typeof action !== 'function') {
      throw new TypeError(`Action "${name}.${actionName}" must be a function`);
    }
    if (actionName in store) throw new Error(`Action name "${actionName}" is reserved`);

    store[actionName] = function (...args) {
      assertAlive();
      return action.apply(store, args);
    };
  });

  instances.set(instanceName, store);
  if (persistence) {
    stopPersisting = store.subscribe((currentState) => persistence.set(cloneState(currentState)), false);
  }
  definition.onCreate?.call(store);
  return store;
}

export function defineStore(name, options = {}) {
  if (!name) throw new Error('Store name is required');
  if (definitions.has(name)) throw new Error(`Store "${name}" has already been defined`);

  const definition = {
    state: options.state || (() => ({})),
    actions: options.actions || {},
    onCreate: options.onCreate,
    onDestroy: options.onDestroy,
    persist: options.persist,
  };

  definitions.set(name, definition);

  // 默认返回同名单例；传入 instanceName 时可创建临时命名实例。
  return (instanceName = name) => useStore(name, instanceName);
}

export function useStore(name, instanceName = name) {
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

export function destroyStore(instanceName) {
  instances.get(instanceName)?.destroy();
}

export function hasStore(instanceName) {
  return instances.has(instanceName);
}

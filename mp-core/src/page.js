import { context, appContext } from './context.js';
import { bindStore, unbindStores } from './store-bind.js';

function runSafely(operations) {
  const errors = [];
  operations.forEach((operation) => {
    try {
      operation?.();
    } catch (error) {
      errors.push(error);
    }
  });
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) {
    const error = new Error('Multiple page cleanup operations failed');
    error.name = 'PageCleanupError';
    error.errors = errors;
    throw error;
  }
}

export function definePage(factory) {
  const pageOptions = typeof factory === 'function' ? factory(appContext) : factory;
  if (!pageOptions || typeof pageOptions !== 'object') {
    throw new TypeError('definePage requires an options object or factory');
  }
  const { onLoad, onShow, onReady, onHide, onUnload, storeBindings = {} } = pageOptions;
  const wrappedOptions = Object.assign({}, pageOptions);
  delete wrappedOptions.storeBindings;

  return Object.assign(wrappedOptions, {
    onLoad(...args) {
      const record = context.record(this);

      Object.entries(storeBindings).forEach(([dataKey, binding]) => {
        const config = typeof binding === 'function' ? { store: binding() } : binding;
        const store = typeof config.store === 'function' ? config.store() : config.store;
        bindStore(this, store, config.select, dataKey);
      });

      context.plugins.forEach((plugin) => {
        context.addCleanup(this, plugin.onLoad?.(this, appContext, ...args));
      });
      return onLoad?.apply(this, args);
    },

    onShow(...args) {
      context.setActive(this);
      context.plugins.forEach((plugin) => plugin.onShow?.(this, appContext, ...args));
      return onShow?.apply(this, args);
    },

    onReady(...args) {
      let result;
      try {
        result = onReady?.apply(this, args);
      } catch (error) {
        context.record(this).ready.resolve(this);
        throw error;
      }
      return Promise.resolve(result).finally(() => context.record(this).ready.resolve(this));
    },

    onHide(...args) {
      context.plugins.forEach((plugin) => plugin.onHide?.(this, appContext, ...args));
      return onHide?.apply(this, args);
    },

    onUnload(...args) {
      const record = context.record(this);
      let result;
      let unloadError;
      try {
        result = onUnload?.apply(this, args);
      } catch (error) {
        unloadError = error;
      }

      const operations = [
        () => unbindStores(this),
        ...record.cleanups.splice(0),
        ...context.plugins.map((plugin) => () => plugin.onUnload?.(this, appContext, ...args)),
        () => context.deleteRecord(this),
        () => {
          if (context.current === this) context.current = null;
        },
      ];
      if (unloadError) {
        operations.unshift(() => {
          throw unloadError;
        });
      }
      runSafely(operations);
      return result;
    },

    $onCleanup(cleanup) {
      return context.addCleanup(this, cleanup);
    },

    $setTimeout(handler, delay) {
      const timer = setTimeout(handler, delay);
      context.addCleanup(this, () => clearTimeout(timer));
      return timer;
    },

    $setInterval(handler, interval) {
      const timer = setInterval(handler, interval);
      context.addCleanup(this, () => clearInterval(timer));
      return timer;
    },
  });
}

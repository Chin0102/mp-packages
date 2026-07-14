export function createEmitter() {
  const listeners = new Map();

  function on(type, handler) {
    if (typeof handler !== 'function') throw new TypeError('Event handler must be a function');
    let handlers = listeners.get(type);
    if (!handlers) {
      handlers = new Set();
      listeners.set(type, handlers);
    }
    handlers.add(handler);
    return () => off(type, handler);
  }

  function once(type, handler) {
    if (typeof handler !== 'function') throw new TypeError('Event handler must be a function');
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
    return listeners.get(type)?.size || 0;
  }

  return {
    on,
    once,
    off,
    emit,
    clear,
    listenerCount,
  };
}

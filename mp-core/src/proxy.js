const cache = new WeakMap();

export function readonly(obj) {
  if (!obj || typeof obj !== 'object') return obj;

  const cached = cache.get(obj);
  if (cached) return cached;

  const deny = () => {
    throw new TypeError('Cannot modify readonly state');
  };

  const proxy = new Proxy(obj, {
    get(target, key, receiver) {
      return readonly(Reflect.get(target, key, receiver));
    },
    set: deny,
    deleteProperty: deny,
    defineProperty: deny,
    setPrototypeOf: deny,
    preventExtensions: deny,
  });

  cache.set(obj, proxy);
  return proxy;
}

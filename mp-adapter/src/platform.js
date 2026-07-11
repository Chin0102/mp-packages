const info = {
  name: '',
  overwrites: {},
  adapter: null,
};

const hasOwn = (object, key) => Object.prototype.hasOwnProperty.call(object, key);

function nativePlatform() {
  return globalThis[getName()];
}

function createAdapter(overwrites) {
  let boundNative;
  let boundMethods = new WeakMap();

  return new Proxy(
    {},
    {
      get(target, key, receiver) {
        if (hasOwn(overwrites, key)) {
          return Reflect.get(overwrites, key, receiver);
        }

        const native = nativePlatform();
        const value = Reflect.get(native, key, native);

        // Some hosts require their API methods to be called with the platform
        // object as `this`. Keep that behavior while exposing them via a proxy.
        if (typeof value === 'function') {
          if (native !== boundNative) {
            boundNative = native;
            boundMethods = new WeakMap();
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
        return [...new Set([...Reflect.ownKeys(nativePlatform()), ...Reflect.ownKeys(overwrites)])];
      },

      getOwnPropertyDescriptor(target, key) {
        if (hasOwn(overwrites, key)) {
          const descriptor = Reflect.getOwnPropertyDescriptor(overwrites, key);
          return { ...descriptor, configurable: true };
        }

        const descriptor = Reflect.getOwnPropertyDescriptor(nativePlatform(), key);
        return descriptor && { ...descriptor, configurable: true };
      },
    },
  );
}

export function getName() {
  return info.name;
}

export function platform() {
  if (!info.name) return undefined;
  return info.adapter;
}

export function initPlatform(name, overwrites = {}) {
  if (typeof name !== 'string' || !name) {
    throw new TypeError('Platform name must be a non-empty string');
  }
  if (overwrites === null || typeof overwrites !== 'object') {
    throw new TypeError('Platform overwrites must be an object');
  }

  info.name = name;
  info.overwrites = overwrites;
  info.adapter = createAdapter(overwrites);

  return info.adapter;
}

export function getEnv() {
  let version = 'develop';
  try {
    version = platform().getAccountInfoSync?.().miniProgram?.envVersion || version;
  } catch (e) {}

  return {
    version,
    dev: version === 'develop',
    trial: version === 'trial',
    prod: version === 'release',
  };
}

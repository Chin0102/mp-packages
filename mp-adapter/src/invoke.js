import { platform } from './platform.js';

export function invoke(api, options = {}) {
  const method = platform()?.[api];
  if (typeof method !== 'function') {
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
          success?.(result);
        },
        fail(error) {
          reject(error);
          fail?.(error);
        },
      });
    } catch (error) {
      reject(error);
    }
  });

  Object.defineProperty(promise, 'task', {
    enumerable: true,
    get: () => task,
  });

  return promise;
}

export function mapResult(promise, transform) {
  const mapped = promise.then(transform);
  Object.defineProperty(mapped, 'task', {
    enumerable: true,
    get: () => promise.task,
  });
  return mapped;
}

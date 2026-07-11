import { platform } from './platform.js';

export function listenForUpdate(options = {}) {
  const api = platform();
  if (api.canIUse && !api.canIUse('getUpdateManager')) return null;

  const manager = api.getUpdateManager?.();
  if (!manager) return null;

  const listeners = [
    ['onCheckForUpdate', 'offCheckForUpdate', options.onCheck],
    ['onUpdateReady', 'offUpdateReady', options.onReady],
    ['onUpdateFailed', 'offUpdateFailed', options.onFailed],
  ];

  listeners.forEach(([on, , listener]) => {
    if (listener) manager[on]?.(listener);
  });

  return {
    manager,
    apply: () => manager.applyUpdate(),
    dispose() {
      listeners.forEach(([, off, listener]) => {
        if (listener) manager[off]?.(listener);
      });
    },
  };
}

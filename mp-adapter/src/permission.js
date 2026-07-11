import { invoke, mapResult } from './invoke.js';
import { platform } from './platform.js';

let settingCache;
let settingPlatform;

export function getSetting(options = {}) {
  const currentPlatform = platform();
  if (settingPlatform !== currentPlatform) {
    settingPlatform = currentPlatform;
    settingCache = undefined;
  }
  if (options.fresh || !settingCache) {
    const { fresh, ...apiOptions } = options;
    const pending = invoke('getSetting', apiOptions);
    const cached = pending.catch((error) => {
      if (settingCache === cached) settingCache = undefined;
      throw error;
    });
    settingCache = cached;
  }
  return settingCache;
}

export async function isAuthorized(scope, options = {}) {
  const setting = await getSetting(options);
  return setting.authSetting?.[scope] === true;
}

export async function authorize(scope) {
  if (await isAuthorized(scope)) return;
  await invoke('authorize', { scope });
  settingCache = mapResult(Promise.resolve(settingCache), (setting) => ({
    ...setting,
    authSetting: { ...setting.authSetting, [scope]: true },
  }));
}

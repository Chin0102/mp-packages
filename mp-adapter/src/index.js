export const VERSION = '0.1.1';

export { vibrate } from './device.js';
export { HttpError, login, requestData, uploadFile } from './network.js';
export { authorize, getSetting, isAuthorized } from './permission.js';
export { getEnv, getName, initPlatform, platform } from './platform.js';
export { createStorage } from './storage.js';
export { getSystemInfo } from './system.js';
export { listenForUpdate } from './update.js';

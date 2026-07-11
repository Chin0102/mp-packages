import { invoke } from './invoke.js';

const shortTypes = new Set(['light', 'medium', 'heavy']);

export function vibrate(type = 'medium') {
  if (type === 'long') return invoke('vibrateLong');
  if (!shortTypes.has(type)) {
    return Promise.reject(new TypeError(`Unknown vibration type "${type}"`));
  }
  return invoke('vibrateShort', { type });
}

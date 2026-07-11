import { getEnv, platform } from './platform.js';

export function getSystemInfo() {
  const api = platform();
  const info = api.getSystemInfoSync();
  const { system = '', platform: systemPlatform = '', statusBarHeight = 0, screenWidth = 0, screenHeight = 0, pixelRatio = 1 } = info;
  const safeArea = info.safeArea || {
    left: 0,
    right: screenWidth,
    top: 0,
    bottom: screenHeight,
    width: screenWidth,
    height: screenHeight,
  };
  const menuButton = api.getMenuButtonBoundingClientRect?.() || {};
  const px2rpx = screenWidth ? 750 / screenWidth : 1;
  const navigationHeight = menuButton.bottom ? menuButton.bottom + (menuButton.top - statusBarHeight) : statusBarHeight + 44;

  return {
    ...info,
    env: getEnv(),
    os: /ios/i.test(system) ? 'ios' : 'android',
    isDevtools: systemPlatform === 'devtools',
    pixelRatio,
    screenWidth,
    screenHeight,
    statusBarHeight,
    navigationHeight,
    menuButton,
    safeArea,
    safeBottom: (screenHeight - safeArea.bottom) * px2rpx,
    px2rpx,
  };
}

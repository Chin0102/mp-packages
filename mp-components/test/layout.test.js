import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createNavigationLayout, getNavigationOpacity, getPageBottomHeight } from '../src/index.js';

test('creates navigation layout from the real menu button rectangle', () => {
  const layout = createNavigationLayout({
    screenWidth: 375,
    statusBarHeight: 44,
    navigationHeight: 84,
    px2rpx: 2,
    menuButton: {
      top: 48,
      right: 368,
      height: 32,
    },
  });

  assert.equal(layout.navigationHeightRpx, 168);
  assert.equal(layout.contentTopRpx, 96);
  assert.equal(layout.contentHeightRpx, 64);
  assert.equal(layout.contentBottomRpx, 8);
  assert.equal(layout.rightGapRpx, 14);
  assert.equal(layout.leftGapRpx, 14);
  assert.equal(layout.navigationStyle, 'height:168rpx;padding:96rpx 14rpx 8rpx 14rpx;');
});

test('supports a custom left padding without changing the capsule-side gap', () => {
  const layout = createNavigationLayout(
    {
      screenWidth: 375,
      statusBarHeight: 44,
      navigationHeight: 84,
      px2rpx: 2,
      menuButton: { top: 48, right: 368, height: 32 },
    },
    40,
  );

  assert.equal(layout.leftGapRpx, 40);
  assert.equal(layout.rightGapRpx, 14);
});

test('uses safe navigation fallbacks when the menu button is unavailable', () => {
  const layout = createNavigationLayout({
    screenWidth: 375,
    statusBarHeight: 20,
    navigationHeight: 64,
    px2rpx: 2,
  });

  assert.equal(layout.navigationHeightRpx, 128);
  assert.equal(layout.contentTopRpx, 40);
  assert.equal(layout.contentHeightRpx, 88);
  assert.equal(layout.rightGapRpx, 32);
});

test('creates a usable default layout when system information is incomplete', () => {
  const layout = createNavigationLayout();

  assert.equal(layout.navigationHeightRpx, 44);
  assert.equal(layout.contentHeightRpx, 44);
  assert.equal(layout.rightGapRpx, 16);
});

test('calculates and clamps the bottom safe-area spacer', () => {
  assert.equal(getPageBottomHeight({ safeBottom: 68 }, 40, 20), 88);
  assert.equal(getPageBottomHeight({ safeBottom: 0 }, 40, 20), 60);
  assert.equal(getPageBottomHeight({ safeBottom: 20 }, -10, -20), 20);
});

test('calculates navigation opacity over a configurable distance', () => {
  assert.equal(getNavigationOpacity(0), 0);
  assert.equal(getNavigationOpacity(100), 0.5);
  assert.equal(getNavigationOpacity(300), 1);
  assert.equal(getNavigationOpacity(50, 100), 0.5);
  assert.equal(getNavigationOpacity(-1), 0);
});

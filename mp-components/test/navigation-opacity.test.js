import assert from 'node:assert/strict';
import { test } from 'node:test';

globalThis.Behavior = (options) => options;
const { default: opacityBehavior } = await import('../src/mp-navigation/opacity-with-scroll.js');
delete globalThis.Behavior;

function createPage(data = {}) {
  return {
    data: {
      ...opacityBehavior.data,
      ...data,
    },
    ...opacityBehavior.methods,
    setData(update) {
      Object.assign(this.data, update);
    },
  };
}

test('keeps scroll throttling state on each page instance', () => {
  const first = createPage();
  const second = createPage();
  first._mpNavigationOpacityUpdatedAt = Date.now();

  first.onScroll({ detail: { scrollTop: 100 } });
  second.onScroll({ detail: { scrollTop: 100 } });

  assert.equal(first.data.navBgOpacity, 0);
  assert.equal(second.data.navBgOpacity, 0.5);
});

test('resets opacity immediately when returning to the top', () => {
  const page = createPage({ navBgOpacity: 1 });
  page._mpNavigationOpacityUpdatedAt = Date.now();

  page.onPageScroll({ scrollTop: 0 });

  assert.equal(page.data.navBgOpacity, 0);
  assert.equal(page._mpNavigationOpacityUpdatedAt, 0);
});

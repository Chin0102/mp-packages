import assert from 'node:assert/strict';
import { test } from 'node:test';

let importIndex = 0;

async function loadComponent(name) {
  let definition;
  globalThis.Component = (options) => {
    definition = options;
  };
  await import(`../src/${name}/index.js?test=${importIndex++}`);
  delete globalThis.Component;
  return definition;
}

const overlay = await loadComponent('mp-overlay');
const popup = await loadComponent('mp-popup');
const dialog = await loadComponent('mp-dialog');

function createInstance(definition, data = {}) {
  const events = [];
  return {
    data,
    events,
    ...definition.methods,
    setData(update) {
      Object.assign(this.data, update);
    },
    triggerEvent(type, detail) {
      events.push({ type, detail });
    },
  };
}

test('mp-overlay clamps visual values and requests close on tap', () => {
  const instance = createInstance(overlay, {
    zIndex: 12,
    opacity: 2,
    backgroundColor: '#123456',
    closeOnTap: true,
  });

  instance.updateStyle();
  instance.handleTap({ target: { dataset: { mpOverlay: 'root' } } });
  instance.handleTap({ target: { dataset: {} } });

  assert.equal(instance.data.overlayStyle, 'z-index:12;background-color:#123456;opacity:1;');
  assert.deepEqual(instance.events, [
    { type: 'tap', detail: undefined },
    { type: 'close', detail: { source: 'overlay' } },
  ]);
});

test('mp-popup normalizes position and emits overlay events', () => {
  const instance = createInstance(popup, {
    position: 'unknown',
    duration: -1,
    closeOnOverlay: true,
  });

  instance.updateStyle();
  instance.handleOverlayTap();
  instance.handleOverlayClose();

  assert.equal(instance.data.positionClass, 'mp-popup__content--center');
  assert.equal(instance.data.animationStyle, 'animation-duration:0ms;');
  assert.deepEqual(instance.events, [
    { type: 'overlaytap', detail: undefined },
    { type: 'close', detail: { source: 'overlay' } },
  ]);
});

test('mp-dialog emits semantic actions and ignores disabled actions', () => {
  const instance = createInstance(dialog, {
    cancelDisabled: false,
    confirmDisabled: false,
    confirmLoading: false,
  });

  instance.handleCancel();
  instance.handleConfirm();
  instance.data.confirmLoading = true;
  instance.handleConfirm();

  assert.deepEqual(instance.events, [
    { type: 'cancel', detail: undefined },
    { type: 'close', detail: { source: 'cancel' } },
    { type: 'confirm', detail: undefined },
    { type: 'close', detail: { source: 'confirm' } },
  ]);
});

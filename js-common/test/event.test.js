import assert from 'node:assert/strict';
import { test } from 'node:test';

import { createEmitter } from '../src/index.js';

test('emitter subscribes, emits, and unsubscribes listeners', () => {
  const emitter = createEmitter();
  const values = [];
  const unsubscribe = emitter.on('change', (value) => values.push(value));

  assert.equal(emitter.listenerCount('change'), 1);
  assert.equal(emitter.emit('change', 1), 1);
  unsubscribe();
  assert.equal(emitter.emit('change', 2), 0);
  assert.deepEqual(values, [1]);
});

test('emitter supports once and safe removal during dispatch', () => {
  const emitter = createEmitter();
  const calls = [];
  let removeSecond;
  emitter.once('ready', () => calls.push('once'));
  emitter.on('ready', () => {
    calls.push('first');
    removeSecond();
  });
  removeSecond = emitter.on('ready', () => calls.push('second'));

  assert.equal(emitter.emit('ready'), 3);
  assert.equal(emitter.emit('ready'), 1);
  assert.deepEqual(calls, ['once', 'first', 'second', 'first']);
});

test('emitter clears one event or all listeners', () => {
  const emitter = createEmitter();
  emitter.on('a', () => {});
  emitter.on('b', () => {});
  assert.equal(emitter.clear('a'), true);
  assert.equal(emitter.listenerCount('a'), 0);
  emitter.clear();
  assert.equal(emitter.listenerCount('b'), 0);
});

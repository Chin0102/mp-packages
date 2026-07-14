import assert from 'node:assert/strict';
import { test } from 'node:test';

import { debounce, delay, throttle } from '../src/index.js';

test('debounce invokes the latest trailing call and supports flush', async () => {
  const values = [];
  const invoke = debounce((value) => values.push(value), 10);
  invoke(1);
  invoke(2);
  assert.equal(invoke.pending(), true);
  assert.equal(invoke.flush(), 1);
  assert.equal(invoke.pending(), false);
  assert.deepEqual(values, [2]);
  await delay(15);
  assert.deepEqual(values, [2]);
});

test('debounce supports leading calls and cancellation', async () => {
  const values = [];
  const invoke = debounce((value) => values.push(value), 5, { leading: true });
  invoke(1);
  invoke(2);
  invoke.cancel();
  await delay(10);
  assert.deepEqual(values, [1]);
});

test('throttle invokes leading and latest trailing calls', async () => {
  const values = [];
  const invoke = throttle((value) => values.push(value), 10);
  invoke(1);
  invoke(2);
  invoke(3);
  assert.deepEqual(values, [1]);
  await delay(15);
  assert.deepEqual(values, [1, 3]);
});

test('throttle supports flush and cancellation', () => {
  const values = [];
  const invoke = throttle((value) => values.push(value), 100);
  invoke(1);
  invoke(2);
  invoke.flush();
  invoke(3);
  invoke.cancel();
  assert.deepEqual(values, [1, 2]);
});

test('throttle stays idle when leading and trailing are disabled', async () => {
  let calls = 0;
  const invoke = throttle(
    () => {
      calls += 1;
    },
    1,
    { leading: false, trailing: false },
  );

  invoke();
  await delay(2);
  invoke();
  assert.equal(calls, 0);
});

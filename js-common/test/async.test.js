import assert from 'node:assert/strict';
import { test } from 'node:test';

import { deferred, delay, memoizeAsync, settle } from '../src/index.js';

test('deferred exposes external resolve and reject controls', async () => {
  const resolved = deferred();
  resolved.resolve('done');
  assert.equal(await resolved.promise, 'done');

  const rejected = deferred();
  rejected.reject(new Error('failed'));
  await assert.rejects(rejected.promise, /failed/);
});

test('settle returns a discriminated result for values and errors', async () => {
  assert.deepEqual(await settle(Promise.resolve(42)), { ok: true, value: 42, error: undefined });
  const error = new Error('failed');
  assert.deepEqual(await settle(() => Promise.reject(error)), { ok: false, value: undefined, error });
});

test('delay resolves with the provided value', async () => {
  assert.equal(await delay(1, 'ready'), 'ready');
});

test('memoizeAsync merges concurrent calls and caches by argument identity', async () => {
  let calls = 0;
  const load = memoizeAsync(async (id, variant) => {
    calls += 1;
    await delay(1);
    return `${id}:${variant}`;
  });

  const first = load(1, 'full');
  const second = load(1, 'full');
  assert.equal(first, second);
  assert.equal(await first, '1:full');
  assert.equal(await load(1, 'full'), '1:full');
  assert.equal(await load(1, 'short'), '1:short');
  assert.equal(calls, 2);
});

test('memoizeAsync expires, invalidates, refreshes, and clears entries', async () => {
  let timestamp = 0;
  let calls = 0;
  const load = memoizeAsync(async (id) => `${id}:${++calls}`, {
    ttl: 10,
    now: () => timestamp,
  });

  assert.equal(await load('a'), 'a:1');
  timestamp = 9;
  assert.equal(await load('a'), 'a:1');
  timestamp = 10;
  assert.equal(await load('a'), 'a:2');
  assert.equal(load.invalidate('a'), true);
  assert.equal(load.invalidate('a'), false);
  assert.equal(await load('a'), 'a:3');
  assert.equal(await load.refresh('a'), 'a:4');
  load.clear();
  assert.equal(await load('a'), 'a:5');
});

test('memoizeAsync evicts rejected calls unless configured otherwise', async () => {
  let calls = 0;
  const error = new Error('failed');
  const load = memoizeAsync(async () => {
    calls += 1;
    throw error;
  });

  await assert.rejects(load(), /failed/);
  await assert.rejects(load(), /failed/);
  assert.equal(calls, 2);

  const cached = memoizeAsync(
    async () => {
      calls += 1;
      throw error;
    },
    { cacheRejected: true },
  );
  const first = cached();
  await assert.rejects(first, /failed/);
  assert.equal(cached(), first);
});

test('memoizeAsync supports a custom cache key', async () => {
  let calls = 0;
  const load = memoizeAsync(async (user) => ++calls, { key: (user) => user.id });

  assert.equal(await load({ id: 1 }), 1);
  assert.equal(await load({ id: 1 }), 1);
  assert.equal(calls, 1);
});

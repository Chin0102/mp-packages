import assert from 'node:assert/strict';
import { test } from 'node:test';

import { readonly } from '../src/index.js';

test('readonly recursively prevents mutations and preserves proxy identity', () => {
  const source = { nested: { value: 1 }, list: [{ id: 1 }] };
  const state = readonly(source);

  assert.equal(readonly(source), state);
  assert.equal(state.nested, state.nested);
  assert.throws(() => {
    state.nested.value = 2;
  }, /readonly/);
  assert.throws(() => {
    state.list.push({ id: 2 });
  }, /readonly/);
  assert.deepEqual(source, { nested: { value: 1 }, list: [{ id: 1 }] });
});

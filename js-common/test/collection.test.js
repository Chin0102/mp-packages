import assert from 'node:assert/strict';
import { test } from 'node:test';

import { compareBy, compareByKey, randomInt, sample, sampleSize } from '../src/collection.js';

test('randomInt includes both integer bounds without endpoint rounding bias', () => {
  assert.equal(randomInt(3, 7, () => 0), 3);
  assert.equal(randomInt(3, 7, () => 0.999999), 7);
  assert.throws(() => randomInt(7, 3), /min/);
  assert.throws(() => randomInt(0.5, 3), /safe integers/);
});

test('sample returns one item without changing the input', () => {
  const values = ['a', 'b', 'c'];
  assert.equal(sample(values, () => 0.5), 'b');
  assert.equal(sample([], () => 0), undefined);
  assert.deepEqual(values, ['a', 'b', 'c']);
});

test('sampleSize selects unique values without changing the input', () => {
  const values = [1, 2, 3, 4];
  const randomValues = [0.75, 0, 0];
  const selected = sampleSize(values, 3, () => randomValues.shift());

  assert.deepEqual(selected, [4, 2, 3]);
  assert.deepEqual(values, [1, 2, 3, 4]);
  assert.deepEqual(sampleSize(values, 10, () => 0), [1, 2, 3, 4]);
});

test('collection random helpers validate random sources', () => {
  assert.throws(() => sample([1], () => 1), /\[0, 1\)/);
  assert.throws(() => sampleSize([1], -1), /non-negative/);
  assert.throws(() => sample('not-an-array'), /array/);
});

test('compareBy sorts selected values and preserves equality', () => {
  const values = [{ score: 2 }, { score: 1 }, { score: 2 }];
  const comparator = compareBy((value) => value.score);

  assert.equal(comparator(values[0], values[2]), 0);
  assert.deepEqual(values.toSorted(comparator), [{ score: 1 }, { score: 2 }, { score: 2 }]);
  assert.deepEqual(values.toSorted(compareByKey('score', { descending: true })), [
    { score: 2 },
    { score: 2 },
    { score: 1 },
  ]);
});

test('compareBy handles null values and custom comparisons', () => {
  assert.deepEqual([2, null, 1].toSorted(compareBy()), [1, 2, null]);
  assert.deepEqual([2, null, 1].toSorted(compareBy(undefined, { nulls: 'first' })), [null, 1, 2]);
  assert.deepEqual(
    ['bbb', 'a', 'cc'].toSorted(compareBy((value) => value, { compare: (left, right) => left.length - right.length })),
    ['a', 'cc', 'bbb'],
  );
});

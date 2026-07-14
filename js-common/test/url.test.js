import assert from 'node:assert/strict';
import { test } from 'node:test';

import { appendQuery, compactDefined, parseQuery, stringifyQuery } from '../src/index.js';

test('stringifyQuery encodes values, repeats arrays, and skips undefined', () => {
  assert.equal(stringifyQuery({ name: 'Tom Lee', tag: ['a&b', 'c'], empty: null, skip: undefined }), 'name=Tom%20Lee&tag=a%26b&tag=c&empty=');
});

test('appendQuery preserves existing queries and hash fragments', () => {
  assert.equal(appendQuery('/page', { id: 1 }), '/page?id=1');
  assert.equal(appendQuery('/page?from=home#title', { id: 1 }), '/page?from=home&id=1#title');
  assert.equal(appendQuery('/page?', { id: 1 }), '/page?id=1');
});

test('parseQuery decodes full URLs and collects repeated values', () => {
  assert.deepEqual(parseQuery('/page?name=Tom+Lee&tag=a%26b&tag=c#title'), {
    name: 'Tom Lee',
    tag: ['a&b', 'c'],
  });
  assert.deepEqual(parseQuery('enabled&empty='), { enabled: '', empty: '' });
});

test('parseQuery safely handles prototype-shaped keys', () => {
  const result = parseQuery('__proto__=safe&constructor=value');
  assert.equal(Object.prototype.hasOwnProperty.call(result, '__proto__'), true);
  assert.equal(result.__proto__, 'safe');
  assert.equal(result.constructor, 'value');
});

test('compactDefined removes only undefined values', () => {
  assert.deepEqual(compactDefined({ zero: 0, empty: '', nil: null, skip: undefined }), {
    zero: 0,
    empty: '',
    nil: null,
  });
});

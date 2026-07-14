function assertArray(value) {
  if (!Array.isArray(value)) throw new TypeError('Expected an array');
}

function nextRandom(random) {
  if (typeof random !== 'function') throw new TypeError('random must be a function');
  const value = random();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError('random must return a number in the range [0, 1)');
  }
  return value;
}

export function randomInt(min, max, random = Math.random) {
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) {
    throw new TypeError('min and max must be safe integers');
  }
  if (min > max) throw new RangeError('min must be less than or equal to max');

  const range = max - min + 1;
  if (!Number.isSafeInteger(range) || range <= 0) {
    throw new RangeError('The integer range is too large');
  }
  return min + Math.floor(nextRandom(random) * range);
}

export function sample(array, random = Math.random) {
  assertArray(array);
  if (array.length === 0) return undefined;
  return array[Math.floor(nextRandom(random) * array.length)];
}

export function sampleSize(array, count, random = Math.random) {
  assertArray(array);
  if (!Number.isSafeInteger(count) || count < 0) {
    throw new TypeError('count must be a non-negative safe integer');
  }

  const size = Math.min(count, array.length);
  if (size === 0) return [];

  const copy = array.slice();
  for (let index = 0; index < size; index += 1) {
    const selected = index + Math.floor(nextRandom(random) * (copy.length - index));
    [copy[index], copy[selected]] = [copy[selected], copy[index]];
  }
  return copy.slice(0, size);
}

function defaultCompare(left, right) {
  if (Object.is(left, right)) return 0;
  if (typeof left === 'string' && typeof right === 'string') return left.localeCompare(right);
  return left < right ? -1 : 1;
}

export function compareBy(selector = (value) => value, options = {}) {
  if (typeof selector !== 'function') throw new TypeError('selector must be a function');
  if (options === null || typeof options !== 'object') throw new TypeError('options must be an object');

  const { descending = false, nulls = 'last', compare = defaultCompare } = options;
  if (typeof compare !== 'function') throw new TypeError('compare must be a function');
  if (nulls !== 'first' && nulls !== 'last') throw new TypeError('nulls must be "first" or "last"');

  return (left, right) => {
    const leftValue = selector(left);
    const rightValue = selector(right);
    const leftNull = leftValue == null;
    const rightNull = rightValue == null;

    if (leftNull || rightNull) {
      if (leftNull && rightNull) return 0;
      return leftNull === (nulls === 'first') ? -1 : 1;
    }

    const result = compare(leftValue, rightValue);
    if (!Number.isFinite(result)) throw new TypeError('compare must return a finite number');
    if (result === 0) return 0;
    const normalized = result < 0 ? -1 : 1;
    return descending ? -normalized : normalized;
  };
}

export function compareByKey(key, options) {
  return compareBy((value) => value?.[key], options);
}

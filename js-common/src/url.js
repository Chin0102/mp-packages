function decode(value) {
  const normalized = String(value).replace(/\+/g, ' ');
  try {
    return decodeURIComponent(normalized);
  } catch {
    return normalized;
  }
}

export function stringifyQuery(query = {}) {
  return Object.entries(query)
    .flatMap(([key, value]) => {
      if (value === undefined) return [];
      const values = Array.isArray(value) ? value : [value];
      return values.map((item) => `${encodeURIComponent(key)}=${encodeURIComponent(item ?? '')}`);
    })
    .join('&');
}

export function appendQuery(url, query = {}) {
  const queryString = stringifyQuery(query);
  if (!queryString) return url;

  const hashIndex = url.indexOf('#');
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : '';
  const base = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
  const separator = base.includes('?') ? (base.endsWith('?') || base.endsWith('&') ? '' : '&') : '?';
  return `${base}${separator}${queryString}${hash}`;
}

export function parseQuery(input = '') {
  let query = String(input);
  const questionIndex = query.indexOf('?');
  if (questionIndex >= 0) query = query.slice(questionIndex + 1);
  if (query.startsWith('?')) query = query.slice(1);
  const hashIndex = query.indexOf('#');
  if (hashIndex >= 0) query = query.slice(0, hashIndex);

  const result = {};
  if (!query) return result;

  query.split('&').forEach((part) => {
    if (!part) return;
    const separatorIndex = part.indexOf('=');
    const key = decode(separatorIndex >= 0 ? part.slice(0, separatorIndex) : part);
    const value = decode(separatorIndex >= 0 ? part.slice(separatorIndex + 1) : '');
    if (Object.prototype.hasOwnProperty.call(result, key)) {
      const current = result[key];
      result[key] = Array.isArray(current) ? [...current, value] : [current, value];
    } else {
      Object.defineProperty(result, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value,
      });
    }
  });

  return result;
}

export function compactDefined(value = {}) {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined));
}

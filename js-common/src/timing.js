function normalizeWait(value) {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function debounce(handler, wait = 0, options = {}) {
  if (typeof handler !== 'function') throw new TypeError('debounce handler must be a function');
  wait = normalizeWait(wait);
  const leading = options.leading === true;
  const trailing = options.trailing !== false;
  let timer;
  let lastArgs;
  let lastThis;
  let result;
  let trailingPending = false;

  function invoke() {
    const args = lastArgs;
    const context = lastThis;
    lastArgs = undefined;
    lastThis = undefined;
    trailingPending = false;
    result = handler.apply(context, args);
    return result;
  }

  function timerExpired() {
    timer = undefined;
    if (trailing && trailingPending && lastArgs) invoke();
    else {
      lastArgs = undefined;
      lastThis = undefined;
      trailingPending = false;
    }
  }

  function debounced(...args) {
    const hasTimer = timer !== undefined;
    lastArgs = args;
    lastThis = this;
    trailingPending = hasTimer || !leading;
    if (hasTimer) clearTimeout(timer);
    timer = setTimeout(timerExpired, wait);
    if (leading && !hasTimer) return invoke();
    return result;
  }

  debounced.cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    lastArgs = undefined;
    lastThis = undefined;
    trailingPending = false;
  };

  debounced.flush = () => {
    if (timer === undefined) return result;
    clearTimeout(timer);
    timer = undefined;
    if (trailing && trailingPending && lastArgs) return invoke();
    lastArgs = undefined;
    lastThis = undefined;
    trailingPending = false;
    return result;
  };

  debounced.pending = () => timer !== undefined;
  return debounced;
}

export function throttle(handler, wait = 0, options = {}) {
  if (typeof handler !== 'function') throw new TypeError('throttle handler must be a function');
  wait = normalizeWait(wait);
  const leading = options.leading !== false;
  const trailing = options.trailing !== false;
  let timer;
  let lastInvokeTime = 0;
  let lastArgs;
  let lastThis;
  let result;

  function invoke(timestamp) {
    const args = lastArgs;
    const context = lastThis;
    lastArgs = undefined;
    lastThis = undefined;
    lastInvokeTime = timestamp;
    result = handler.apply(context, args);
    return result;
  }

  function timerExpired() {
    timer = undefined;
    if (trailing && lastArgs) invoke(Date.now());
    else {
      lastArgs = undefined;
      lastThis = undefined;
      lastInvokeTime = 0;
    }
  }

  function throttled(...args) {
    if (!leading && !trailing) return result;
    const timestamp = Date.now();
    if (!lastInvokeTime && !leading) lastInvokeTime = timestamp;
    const remaining = wait - (timestamp - lastInvokeTime);
    lastArgs = args;
    lastThis = this;

    if (remaining <= 0 || remaining > wait) {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      return invoke(timestamp);
    }
    if (timer === undefined && trailing) timer = setTimeout(timerExpired, remaining);
    return result;
  }

  throttled.cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    lastInvokeTime = 0;
    lastArgs = undefined;
    lastThis = undefined;
  };

  throttled.flush = () => {
    if (timer === undefined) return result;
    clearTimeout(timer);
    timer = undefined;
    return lastArgs ? invoke(Date.now()) : result;
  };

  throttled.pending = () => timer !== undefined;
  return throttled;
}

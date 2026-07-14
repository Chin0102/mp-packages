import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';

import { formatCountdown, getCountdownParts } from '../src/countdown.js';

let definition;
globalThis.Component = (options) => {
  definition = options;
};
await import('../src/mp-countdown/index.js');
delete globalThis.Component;

function createInstance(data = {}) {
  const events = [];
  return {
    data: {
      autoStart: true,
      duration: 0,
      format: 'HH:mm:ss',
      interval: 250,
      pauseOnHide: false,
      paused: false,
      targetTime: 0,
      ...data,
    },
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

let now;
let timers;
let timerId;
const originalNow = Date.now;
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;

before(() => {
  Date.now = () => now;
  globalThis.setTimeout = (handler, delay) => {
    const id = ++timerId;
    timers.set(id, { handler, delay });
    return id;
  };
  globalThis.clearTimeout = (id) => timers.delete(id);
});

beforeEach(() => {
  now = 1_000;
  timers = new Map();
  timerId = 0;
});

after(() => {
  Date.now = originalNow;
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
});

function runNextTimer() {
  const [id, timer] = timers.entries().next().value;
  timers.delete(id);
  timer.handler();
  return timer;
}

test('formats countdown values with total hours or day segments', () => {
  const duration = ((2 * 24 + 3) * 60 * 60 + 4 * 60 + 5) * 1000;
  assert.deepEqual(getCountdownParts(duration), {
    remaining: duration,
    totalSeconds: 183845,
    totalMinutes: 3064,
    totalHours: 51,
    days: 2,
    hours: 3,
    minutes: 4,
    seconds: 5,
  });
  assert.equal(formatCountdown(duration), '51:04:05');
  assert.equal(formatCountdown(duration, 'DD天 HH:mm:ss'), '02天 03:04:05');
  assert.equal(formatCountdown(1), '00:00:01');
});

test('counts from a deadline and emits one finish event', () => {
  const instance = createInstance({ duration: 3_000, interval: 1_000 });
  instance.reset();

  assert.equal(instance.data.formatted, '00:00:03');
  assert.equal(timers.size, 1);

  now = 2_100;
  runNextTimer();
  assert.equal(instance.data.remaining, 1_900);
  assert.equal(instance.data.formatted, '00:00:02');

  now = 4_000;
  runNextTimer();
  assert.equal(instance.data.formatted, '00:00:00');
  assert.equal(instance.events.filter((event) => event.type === 'finish').length, 1);
  assert.equal(timers.size, 0);

  instance.start();
  assert.equal(instance.events.filter((event) => event.type === 'finish').length, 1);
});

test('duration countdown freezes while paused and resumes without drift', () => {
  const instance = createInstance({ duration: 5_000, interval: 1_000 });
  instance.reset();
  now = 2_500;
  instance.pause();

  assert.equal(instance.data.remaining, 3_500);
  assert.equal(timers.size, 0);

  now = 10_000;
  instance.start();
  assert.equal(instance._deadline, 13_500);
  assert.equal(instance.data.remaining, 3_500);
});

test('absolute target time keeps real-world time while paused', () => {
  const instance = createInstance({ targetTime: 20_000, interval: 1_000 });
  instance.reset();
  now = 5_000;
  instance.pause();
  assert.equal(instance.data.remaining, 15_000);

  now = 12_000;
  instance.start();
  assert.equal(instance.data.remaining, 8_000);
  instance.pause();
});

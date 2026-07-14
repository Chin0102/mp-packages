import { formatCountdown, getCountdownParts } from '../countdown.js';

function normalizeInterval(value) {
  return Number.isFinite(value) ? Math.max(16, Math.floor(value)) : 250;
}

Component({
  options: {
    multipleSlots: true,
    styleIsolation: 'isolated',
  },

  externalClasses: ['custom-class', 'text-class'],

  properties: {
    duration: {
      type: Number,
      value: 0,
    },
    targetTime: {
      type: Number,
      value: 0,
    },
    autoStart: {
      type: Boolean,
      value: true,
    },
    paused: {
      type: Boolean,
      value: false,
    },
    pauseOnHide: {
      type: Boolean,
      value: false,
    },
    interval: {
      type: Number,
      value: 250,
    },
    format: {
      type: String,
      value: 'HH:mm:ss',
    },
    customStyle: {
      type: String,
      value: '',
    },
  },

  data: {
    days: 0,
    formatted: '00:00:00',
    hours: 0,
    minutes: 0,
    remaining: 0,
    seconds: 0,
  },

  observers: {
    'duration,targetTime'() {
      if (this._mpCountdownAttached) this.reset();
    },
    format() {
      if (this._mpCountdownAttached) this.render(this._remaining, false);
    },
    interval() {
      if (this._running) this.schedule();
    },
    paused(value) {
      if (!this._mpCountdownAttached) return;
      if (value) this.pause();
      else this.start();
    },
    autoStart(value) {
      if (this._mpCountdownAttached && value && !this.data.paused) this.start();
    },
  },

  lifetimes: {
    attached() {
      this._mpCountdownAttached = true;
      this.reset();
    },
    detached() {
      this._mpCountdownAttached = false;
      this.clearTimer();
      this._running = false;
    },
  },

  pageLifetimes: {
    hide() {
      if (!this.data.pauseOnHide || !this._running) return;
      this._resumeOnShow = true;
      this.pause();
    },
    show() {
      if (!this._resumeOnShow) return;
      this._resumeOnShow = false;
      if (!this.data.paused) this.start();
    },
  },

  methods: {
    getInitialRemaining(now = Date.now()) {
      if (Number.isFinite(this.data.targetTime) && this.data.targetTime > 0) {
        return Math.max(0, this.data.targetTime - now);
      }
      return Number.isFinite(this.data.duration) ? Math.max(0, this.data.duration) : 0;
    },

    clearTimer() {
      if (this._timer !== undefined) clearTimeout(this._timer);
      this._timer = undefined;
    },

    render(remaining, emit = true) {
      const parts = getCountdownParts(remaining);
      const detail = {
        ...parts,
        formatted: formatCountdown(parts.remaining, this.data.format),
      };
      this._remaining = parts.remaining;
      this.setData(detail);
      if (emit) this.triggerEvent('tick', detail);
      return detail;
    },

    update(now = Date.now()) {
      const remaining = this._deadline === undefined ? this._remaining : Math.max(0, this._deadline - now);
      const detail = this.render(remaining);

      if (detail.remaining === 0 && this._running) {
        this._running = false;
        this.clearTimer();
        if (!this._finished) {
          this._finished = true;
          this.triggerEvent('finish', detail);
        }
      }
      return detail;
    },

    schedule() {
      this.clearTimer();
      if (!this._running || this._remaining <= 0) return;
      const delay = Math.min(normalizeInterval(this.data.interval), this._remaining);
      this._timer = setTimeout(() => {
        this._timer = undefined;
        this.update();
        this.schedule();
      }, delay);
    },

    start() {
      if (this._running || this._finished) return;

      const now = Date.now();
      if (Number.isFinite(this.data.targetTime) && this.data.targetTime > 0) {
        this._deadline = this.data.targetTime;
      } else {
        const remaining = Number.isFinite(this._remaining) ? this._remaining : this.getInitialRemaining(now);
        this._deadline = now + remaining;
      }

      this._running = true;
      this.update(now);
      this.schedule();
    },

    pause() {
      if (!this._running) return;
      this.update();
      this._running = false;
      this._deadline = undefined;
      this.clearTimer();
    },

    reset() {
      this.clearTimer();
      this._running = false;
      this._finished = false;
      this._deadline = undefined;
      this._remaining = this.getInitialRemaining();
      this.render(this._remaining, false);
      if (this.data.autoStart && !this.data.paused) this.start();
    },
  },
});

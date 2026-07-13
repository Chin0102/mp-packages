var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/mp-navigation/opacity-with-scroll.js
var opacity_with_scroll_exports = {};
__export(opacity_with_scroll_exports, {
  default: () => opacity_with_scroll_default
});
module.exports = __toCommonJS(opacity_with_scroll_exports);

// src/layout.js
function nonNegative(value, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}
function positive(value, fallback = 1) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
function getNavigationOpacity(scrollTop, fadeDistance = 200) {
  const top = nonNegative(scrollTop);
  const distance = positive(fadeDistance, 200);
  return Math.min(distance, top) / distance;
}

// src/mp-navigation/opacity-with-scroll.js
var opacity_with_scroll_default = Behavior({
  data: {
    navBgOpacity: 0,
    navFadeDistance: 200,
    navThrottleInterval: 50
  },
  methods: {
    onScrollTop() {
      this._mpNavigationOpacityUpdatedAt = 0;
      this.setData({ navBgOpacity: 0 });
    },
    onScroll(event) {
      var _a;
      const scrollTop = Number((_a = event == null ? void 0 : event.detail) == null ? void 0 : _a.scrollTop) || 0;
      if (scrollTop <= 0) return this.onScrollTop();
      const now = Date.now();
      const interval = Math.max(0, Number(this.data.navThrottleInterval) || 0);
      if (now - (this._mpNavigationOpacityUpdatedAt || 0) < interval) return;
      this._mpNavigationOpacityUpdatedAt = now;
      this.setData({
        navBgOpacity: getNavigationOpacity(scrollTop, Number(this.data.navFadeDistance))
      });
    },
    onPageScroll(event) {
      this.onScroll({ detail: { scrollTop: event == null ? void 0 : event.scrollTop } });
    }
  }
});

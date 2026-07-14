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

// src/index.js
var src_exports = {};
__export(src_exports, {
  createNavigationLayout: () => createNavigationLayout,
  formatCountdown: () => formatCountdown,
  getCountdownParts: () => getCountdownParts,
  getNavigationOpacity: () => getNavigationOpacity,
  getPageBottomHeight: () => getPageBottomHeight
});
module.exports = __toCommonJS(src_exports);

// src/countdown.js
function normalizeRemaining(value) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}
var pad = (value) => String(value).padStart(2, "0");
function getCountdownParts(remaining) {
  const milliseconds = normalizeRemaining(remaining);
  const totalSeconds = Math.ceil(milliseconds / 1e3);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const totalHours = Math.floor(totalMinutes / 60);
  const days = Math.floor(totalHours / 24);
  return {
    remaining: milliseconds,
    totalSeconds,
    totalMinutes,
    totalHours,
    days,
    hours: totalHours % 24,
    minutes: totalMinutes % 60,
    seconds: totalSeconds % 60
  };
}
function formatCountdown(remaining, format = "HH:mm:ss") {
  const parts = getCountdownParts(remaining);
  const template = typeof format === "string" && format ? format : "HH:mm:ss";
  const includeDays = template.includes("DD");
  const values = {
    DD: pad(parts.days),
    HH: pad(includeDays ? parts.hours : parts.totalHours),
    mm: pad(parts.minutes),
    ss: pad(parts.seconds)
  };
  return template.replace(/DD|HH|mm|ss/gu, (token) => values[token]);
}

// src/layout.js
function nonNegative(value, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}
function positive(value, fallback = 1) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
function createNavigationLayout(info = {}, paddingLeft = -1) {
  const px2rpx = positive(info.px2rpx);
  const statusBarHeight = nonNegative(info.statusBarHeight);
  const navigationHeight = Math.max(statusBarHeight, positive(info.navigationHeight, statusBarHeight + 44));
  const screenWidth = nonNegative(info.screenWidth);
  const menuButton = info.menuButton || {};
  const contentTop = nonNegative(menuButton.top, statusBarHeight);
  const availableContentHeight = Math.max(0, navigationHeight - contentTop);
  const contentHeight = positive(menuButton.height, availableContentHeight || 44);
  const contentBottom = Math.max(0, navigationHeight - contentTop - contentHeight);
  const hasValidMenuRight = Number.isFinite(menuButton.right) && menuButton.right >= 0 && menuButton.right <= screenWidth;
  const rightGap = hasValidMenuRight && screenWidth ? screenWidth - menuButton.right : 16;
  const navigationHeightRpx = navigationHeight * px2rpx;
  const contentTopRpx = contentTop * px2rpx;
  const contentHeightRpx = contentHeight * px2rpx;
  const contentBottomRpx = contentBottom * px2rpx;
  const rightGapRpx = rightGap * px2rpx;
  const leftGapRpx = Number.isFinite(paddingLeft) && paddingLeft >= 0 ? paddingLeft : rightGapRpx;
  return {
    navigationHeightRpx,
    contentTopRpx,
    contentHeightRpx,
    contentBottomRpx,
    rightGapRpx,
    leftGapRpx,
    navigationStyle: `height:${navigationHeightRpx}rpx;padding:${contentTopRpx}rpx ${rightGapRpx}rpx ${contentBottomRpx}rpx ${leftGapRpx}rpx;`,
    contentStyle: `height:${contentHeightRpx}rpx;`,
    placeholderStyle: `height:${navigationHeightRpx}rpx;`
  };
}
function getPageBottomHeight(info = {}, min = 0, append = 0) {
  const safeBottom = nonNegative(info.safeBottom);
  return Math.max(safeBottom, nonNegative(min)) + nonNegative(append);
}
function getNavigationOpacity(scrollTop, fadeDistance = 200) {
  const top = nonNegative(scrollTop);
  const distance = positive(fadeDistance, 200);
  return Math.min(distance, top) / distance;
}

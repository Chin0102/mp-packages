function nonNegative(value, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}

function positive(value, fallback = 1) {
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function createNavigationLayout(info = {}, paddingLeft = -1) {
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
    placeholderStyle: `height:${navigationHeightRpx}rpx;`,
  };
}

export function getPageBottomHeight(info = {}, min = 0, append = 0) {
  const safeBottom = nonNegative(info.safeBottom);
  return Math.max(safeBottom, nonNegative(min)) + nonNegative(append);
}

export function getNavigationOpacity(scrollTop, fadeDistance = 200) {
  const top = nonNegative(scrollTop);
  const distance = positive(fadeDistance, 200);
  return Math.min(distance, top) / distance;
}

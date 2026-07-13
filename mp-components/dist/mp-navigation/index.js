// src/mp-navigation/index.js
var import_mp_adapter = require("@chin0102/mp-adapter");

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

// src/mp-navigation/index.js
Component({
  options: {
    multipleSlots: true,
    styleIsolation: "isolated"
  },
  externalClasses: ["custom-class", "content-class", "background-class"],
  properties: {
    fixed: {
      type: Boolean,
      value: false
    },
    placeholder: {
      type: Boolean,
      value: false
    },
    zIndex: {
      type: Number,
      value: 10
    },
    customStyle: {
      type: String,
      value: ""
    },
    paddingLeft: {
      type: Number,
      value: -1
    },
    pdLeft: {
      type: Number,
      value: -1
    }
  },
  data: {
    navigationStyle: "",
    contentStyle: "",
    placeholderStyle: ""
  },
  observers: {
    "paddingLeft,pdLeft"() {
      if (this._mpNavigationAttached) this.updateLayout();
    }
  },
  lifetimes: {
    attached() {
      this._mpNavigationAttached = true;
      this.updateLayout();
    }
  },
  methods: {
    updateLayout() {
      const paddingLeft = this.data.paddingLeft >= 0 ? this.data.paddingLeft : this.data.pdLeft;
      const layout = createNavigationLayout((0, import_mp_adapter.getSystemInfo)(), paddingLeft);
      this.setData({
        navigationStyle: layout.navigationStyle,
        contentStyle: layout.contentStyle,
        placeholderStyle: layout.placeholderStyle
      });
    }
  }
});

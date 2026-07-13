// src/mp-page-bottom/index.js
var import_mp_adapter = require("@chin0102/mp-adapter");

// src/layout.js
function nonNegative(value, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, value) : fallback;
}
function getPageBottomHeight(info = {}, min = 0, append = 0) {
  const safeBottom = nonNegative(info.safeBottom);
  return Math.max(safeBottom, nonNegative(min)) + nonNegative(append);
}

// src/mp-page-bottom/index.js
Component({
  options: {
    styleIsolation: "isolated"
  },
  externalClasses: ["custom-class"],
  properties: {
    append: {
      type: Number,
      value: 0
    },
    min: {
      type: Number,
      value: 0
    },
    customStyle: {
      type: String,
      value: ""
    }
  },
  data: {
    spacerStyle: ""
  },
  observers: {
    "append,min"() {
      if (this._mpPageBottomAttached) this.updateHeight();
    }
  },
  lifetimes: {
    attached() {
      this._mpPageBottomAttached = true;
      this.updateHeight();
    }
  },
  methods: {
    updateHeight() {
      const height = getPageBottomHeight((0, import_mp_adapter.getSystemInfo)(), this.data.min, this.data.append);
      this.setData({ spacerStyle: `height:${height}rpx;` });
    }
  }
});

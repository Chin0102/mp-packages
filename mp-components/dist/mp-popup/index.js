// src/mp-popup/index.js
var positions = /* @__PURE__ */ new Set(["center", "top", "right", "bottom", "left"]);
Component({
  options: {
    multipleSlots: true,
    styleIsolation: "isolated"
  },
  externalClasses: ["custom-class", "content-class", "overlay-class"],
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    position: {
      type: String,
      value: "center"
    },
    round: {
      type: Boolean,
      value: false
    },
    zIndex: {
      type: Number,
      value: 1e3
    },
    duration: {
      type: Number,
      value: 300
    },
    overlay: {
      type: Boolean,
      value: true
    },
    overlayOpacity: {
      type: Number,
      value: 0.5
    },
    overlayColor: {
      type: String,
      value: "#000000"
    },
    overlayStyle: {
      type: String,
      value: ""
    },
    closeOnOverlay: {
      type: Boolean,
      value: true
    },
    customStyle: {
      type: String,
      value: ""
    }
  },
  data: {
    positionClass: "mp-popup__content--center",
    animationStyle: "animation-duration:300ms;"
  },
  observers: {
    "position,duration"() {
      if (this._mpPopupAttached) this.updateStyle();
    }
  },
  lifetimes: {
    attached() {
      this._mpPopupAttached = true;
      this.updateStyle();
    }
  },
  methods: {
    updateStyle() {
      const position = positions.has(this.data.position) ? this.data.position : "center";
      const duration = Number.isFinite(this.data.duration) ? Math.max(0, this.data.duration) : 300;
      this.setData({
        positionClass: `mp-popup__content--${position}`,
        animationStyle: `animation-duration:${duration}ms;`
      });
    },
    handleOverlayTap() {
      this.triggerEvent("overlaytap");
    },
    handleOverlayClose() {
      if (this.data.closeOnOverlay) this.triggerEvent("close", { source: "overlay" });
    },
    noop() {
    }
  }
});

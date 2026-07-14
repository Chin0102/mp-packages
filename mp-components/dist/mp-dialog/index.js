// src/mp-dialog/index.js
Component({
  options: {
    multipleSlots: true,
    styleIsolation: "isolated"
  },
  externalClasses: ["custom-class", "title-class", "content-class", "footer-class", "cancel-button-class", "confirm-button-class"],
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    title: {
      type: String,
      value: ""
    },
    content: {
      type: String,
      value: ""
    },
    width: {
      type: String,
      value: "600rpx"
    },
    zIndex: {
      type: Number,
      value: 1100
    },
    overlayOpacity: {
      type: Number,
      value: 0.5
    },
    overlayColor: {
      type: String,
      value: "#000000"
    },
    closeOnOverlay: {
      type: Boolean,
      value: false
    },
    showActions: {
      type: Boolean,
      value: true
    },
    showCancel: {
      type: Boolean,
      value: true
    },
    cancelText: {
      type: String,
      value: "\u53D6\u6D88"
    },
    confirmText: {
      type: String,
      value: "\u786E\u5B9A"
    },
    cancelDisabled: {
      type: Boolean,
      value: false
    },
    confirmDisabled: {
      type: Boolean,
      value: false
    },
    confirmLoading: {
      type: Boolean,
      value: false
    },
    customStyle: {
      type: String,
      value: ""
    }
  },
  methods: {
    requestClose(source) {
      this.triggerEvent("close", { source });
    },
    handlePopupClose(event) {
      var _a;
      this.requestClose(((_a = event == null ? void 0 : event.detail) == null ? void 0 : _a.source) || "overlay");
    },
    handleOverlayTap() {
      this.triggerEvent("overlaytap");
    },
    handleCancel() {
      if (this.data.cancelDisabled) return;
      this.triggerEvent("cancel");
      this.requestClose("cancel");
    },
    handleConfirm() {
      if (this.data.confirmDisabled || this.data.confirmLoading) return;
      this.triggerEvent("confirm");
      this.requestClose("confirm");
    }
  }
});

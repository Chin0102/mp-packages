function clampOpacity(value) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5;
}

Component({
  options: {
    multipleSlots: true,
    styleIsolation: 'isolated',
  },

  externalClasses: ['custom-class'],

  properties: {
    visible: {
      type: Boolean,
      value: false,
    },
    zIndex: {
      type: Number,
      value: 1000,
    },
    opacity: {
      type: Number,
      value: 0.5,
    },
    backgroundColor: {
      type: String,
      value: '#000000',
    },
    closeOnTap: {
      type: Boolean,
      value: true,
    },
    lockScroll: {
      type: Boolean,
      value: true,
    },
    customStyle: {
      type: String,
      value: '',
    },
  },

  data: {
    overlayStyle: '',
  },

  observers: {
    'zIndex,opacity,backgroundColor'() {
      if (this._mpOverlayAttached) this.updateStyle();
    },
  },

  lifetimes: {
    attached() {
      this._mpOverlayAttached = true;
      this.updateStyle();
    },
  },

  methods: {
    updateStyle() {
      const zIndex = Number.isFinite(this.data.zIndex) ? this.data.zIndex : 1000;
      const opacity = clampOpacity(this.data.opacity);
      const backgroundColor = this.data.backgroundColor || '#000000';
      this.setData({
        overlayStyle: `z-index:${zIndex};background-color:${backgroundColor};opacity:${opacity};`,
      });
    },

    handleTap(event) {
      if (event && event.target?.dataset?.mpOverlay !== 'root') return;
      this.triggerEvent('tap');
      if (this.data.closeOnTap) this.triggerEvent('close', { source: 'overlay' });
    },

    noop() {},
  },
});

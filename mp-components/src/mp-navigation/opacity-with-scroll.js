import { getNavigationOpacity } from '../layout.js';

export default Behavior({
  data: {
    navBgOpacity: 0,
    navFadeDistance: 200,
    navThrottleInterval: 50,
  },

  methods: {
    onScrollTop() {
      this._mpNavigationOpacityUpdatedAt = 0;
      this.setData({ navBgOpacity: 0 });
    },

    onScroll(event) {
      const scrollTop = Number(event?.detail?.scrollTop) || 0;
      if (scrollTop <= 0) return this.onScrollTop();

      const now = Date.now();
      const interval = Math.max(0, Number(this.data.navThrottleInterval) || 0);
      if (now - (this._mpNavigationOpacityUpdatedAt || 0) < interval) return;

      this._mpNavigationOpacityUpdatedAt = now;
      this.setData({
        navBgOpacity: getNavigationOpacity(scrollTop, Number(this.data.navFadeDistance)),
      });
    },

    onPageScroll(event) {
      this.onScroll({ detail: { scrollTop: event?.scrollTop } });
    },
  },
});

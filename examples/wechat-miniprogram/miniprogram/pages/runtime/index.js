const { getEnv, getSystemInfo } = require('@chin0102/mp-adapter');
const { definePage, appContext } = require('@chin0102/mp-core');

const getDemoStore = () => appContext.services.useDemoStore();

Page(
  definePage({
    data: {
      apiLoading: false,
      apiResult: '尚未请求',
      authResult: '尚未验证',
      demo: {},
      eventMessage: '尚未发送事件',
      environment: getEnv().version,
      preferences: {},
      storageHistory: '尚无变更记录',
      systemSummary: '',
    },

    storeBindings: {
      demo: {
        store: getDemoStore,
        select: (state) => ({ count: state.count, updatedAt: state.updatedAt }),
      },
    },

    onLoad() {
      const app = appContext.services;
      const system = getSystemInfo();
      const preferences = app.preferences.get();
      if (preferences.volume === undefined) app.preferences.patch({ volume: 50 });
      this.setData({
        preferences: app.preferences.get(),
        systemSummary: `${system.system} · ${system.screenWidth}×${system.screenHeight} · 底部安全区 ${system.safeBottom}rpx`,
      });
      this.$onCleanup(
        app.preferences.subscribe((next, previous) => {
          this.setData({
            preferences: next,
            storageHistory: `${JSON.stringify(previous)} → ${JSON.stringify(next)}`,
          });
        }),
      );
      this.$onCleanup(
        app.events.on('example-message', (eventMessage) => {
          this.setData({ eventMessage });
        }),
      );
    },

    increment() {
      getDemoStore().increment();
    },

    resetStore() {
      getDemoStore().reset();
    },

    toggleTheme() {
      const preferences = appContext.services.preferences.get();
      appContext.services.preferences.patch({ theme: preferences.theme === 'light' ? 'dark' : 'light' });
    },

    increaseVolume() {
      const preferences = appContext.services.preferences.get();
      const volume = Math.min(100, (preferences.volume ?? 50) + 10);
      appContext.services.preferences.patch({ volume });
    },

    flushPreferences() {
      appContext.services.preferences.flush();
      this.setData({ storageHistory: `已立即写入：${JSON.stringify(appContext.services.preferences.get())}` });
    },

    reloadPreferences() {
      appContext.services.preferences.reload();
    },

    removePreferences() {
      appContext.services.preferences.remove();
    },

    emitEvent() {
      appContext.services.events.emit('example-message', `事件触发于 ${new Date().toLocaleTimeString()}`);
    },

    async callApi() {
      this.setData({ apiLoading: true, apiResult: '请求中…' });
      try {
        const result = await appContext.services.api.get('/profile');
        this.setData({ apiResult: JSON.stringify(result, null, 2) });
      } catch (error) {
        this.setData({ apiResult: error.message || String(error) });
      } finally {
        this.setData({ apiLoading: false });
      }
    },

    async runConcurrentAuth() {
      const app = appContext.services;
      this.setData({ apiLoading: true, authResult: '并发请求中…' });
      app.auth.logout();
      const before = app.getRuntimeStats();

      try {
        const responses = await Promise.all([
          app.api.get('/concurrent/one'),
          app.api.get('/concurrent/two'),
          app.api.get('/concurrent/three'),
        ]);
        const after = app.getRuntimeStats();
        const tokens = new Set(responses.map((response) => response.authorization));
        this.setData({
          authResult: `3 个请求共触发 ${after.authentications - before.authentications} 次登录，共用 ${tokens.size} 个 Token`,
        });
      } catch (error) {
        this.setData({ authResult: error.message || String(error) });
      } finally {
        this.setData({ apiLoading: false });
      }
    },

    async runAuthRenewal() {
      const app = appContext.services;
      this.setData({ apiLoading: true, authResult: '模拟 Token 过期…' });
      const before = app.getRuntimeStats();

      try {
        const response = await app.api.get(`/renew-profile?request=${Date.now()}`);
        const after = app.getRuntimeStats();
        this.setData({
          authResult: `收到 ${after.unauthorizedResponses - before.unauthorizedResponses} 次 401，续期 ${after.authentications - before.authentications} 次后成功：${response.authorization}`,
        });
      } catch (error) {
        this.setData({ authResult: error.message || String(error) });
      } finally {
        this.setData({ apiLoading: false });
      }
    },

    openToolbox() {
      appContext.navigate('/pages/toolbox/index', { source: 'runtime' });
    },
  }),
);

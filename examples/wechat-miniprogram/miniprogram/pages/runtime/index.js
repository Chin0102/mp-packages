const { definePage, getEnv } = require('@chin0102/mp-core');

const getDemoStore = () => getApp().useDemoStore();

Page(
  definePage({
    data: {
      apiLoading: false,
      apiResult: '尚未请求',
      demo: {},
      eventMessage: '尚未发送事件',
      environment: getEnv().version,
      preferences: {},
    },

    storeBindings: {
      demo: {
        store: getDemoStore,
        select: (state) => ({ count: state.count, updatedAt: state.updatedAt }),
      },
    },

    onLoad() {
      const app = getApp();
      this.setData({ preferences: app.preferences.get() });
      this.$onCleanup(
        app.preferences.subscribe((preferences) => {
          this.setData({ preferences });
        }),
      );
      this.$onCleanup(
        app.events.on('example-message', (eventMessage) => {
          this.setData({ eventMessage });
        }),
      );
    },

    onShow() {
      this.getTabBar?.()?.setData({ selected: 1 });
    },

    increment() {
      getDemoStore().increment();
    },

    resetStore() {
      getDemoStore().reset();
    },

    toggleTheme() {
      const preferences = getApp().preferences.get();
      getApp().preferences.patch({ theme: preferences.theme === 'light' ? 'dark' : 'light' });
    },

    emitEvent() {
      getApp().events.emit('example-message', `事件触发于 ${new Date().toLocaleTimeString()}`);
    },

    async callApi() {
      this.setData({ apiLoading: true, apiResult: '请求中…' });
      try {
        const result = await getApp().api.get('/profile');
        this.setData({ apiResult: JSON.stringify(result, null, 2) });
      } catch (error) {
        this.setData({ apiResult: error.message || String(error) });
      } finally {
        this.setData({ apiLoading: false });
      }
    },
  }),
);

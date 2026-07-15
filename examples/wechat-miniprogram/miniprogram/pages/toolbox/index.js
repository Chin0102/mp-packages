const {
  appendQuery,
  debounce,
  delay,
  memoizeAsync,
  parseQuery,
  stringifyQuery,
  throttle,
} = require('@chin0102/js-common');
const { definePage, appContext } = require('@chin0102/mp-core');

Page(
  definePage({
    data: {
      debounceInput: '',
      debounceResult: '等待输入',
      memoLoading: false,
      memoResult: '尚未调用',
      parsedQuery: '',
      source: 'direct',
      throttleRuns: 0,
      throttleTaps: 0,
      urlResult: '',
    },

    onLoad(options) {
      this._memoExecutions = 0;
      this._loadCatalog = memoizeAsync(async (category) => {
        this._memoExecutions += 1;
        await delay(350);
        return { category, loadedAt: new Date().toLocaleTimeString() };
      }, { ttl: 5000 });
      this._saveInput = debounce((value) => {
        this.setData({ debounceResult: `已保存：${value || '空内容'}` });
      }, 600);
      this._renderScroll = throttle(() => {
        this.setData({ throttleRuns: this.data.throttleRuns + 1 });
      }, 600);

      const urlResult = appendQuery('/pages/detail/index#preview', {
        id: 42,
        tag: ['core', 'adapter'],
        keyword: '小程序工具',
      });
      this.setData({
        parsedQuery: JSON.stringify(parseQuery(urlResult), null, 2),
        source: options.source || 'direct',
        urlResult,
      });

      this.$onCleanup(() => {
        this._saveInput.cancel();
        this._renderScroll.cancel();
        this._loadCatalog.clear();
      });
    },

    handleDebounceInput(event) {
      const debounceInput = event.detail.value;
      this.setData({ debounceInput, debounceResult: '等待 600ms…' });
      this._saveInput(debounceInput);
    },

    flushDebounce() {
      this._saveInput.flush();
    },

    tapThrottle() {
      this.setData({ throttleTaps: this.data.throttleTaps + 1 });
      this._renderScroll();
    },

    async runMemoized() {
      const before = this._memoExecutions;
      this.setData({ memoLoading: true, memoResult: '同时发起 3 次相同调用…' });
      const results = await Promise.all([
        this._loadCatalog('components'),
        this._loadCatalog('components'),
        this._loadCatalog('components'),
      ]);
      this.setData({
        memoLoading: false,
        memoResult: `3 次调用，实际执行 ${this._memoExecutions - before} 次；结果时间 ${results[0].loadedAt}`,
      });
    },

    async refreshMemoized() {
      const before = this._memoExecutions;
      this.setData({ memoLoading: true, memoResult: '强制刷新缓存…' });
      const result = await this._loadCatalog.refresh('components');
      this.setData({
        memoLoading: false,
        memoResult: `refresh() 新执行 ${this._memoExecutions - before} 次；结果时间 ${result.loadedAt}`,
      });
    },

    rebuildQuery() {
      const query = parseQuery(this.data.urlResult);
      this.setData({ parsedQuery: stringifyQuery(query) });
    },

    goComponents() {
      appContext.navigate('/pages/components/index');
    },

    goBack() {
      appContext.back();
    },
  }),
);

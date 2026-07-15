const { createEmitter } = require('@chin0102/js-common');
const { createStorage } = require('@chin0102/mp-adapter');
const { createApiClient, createAuth, defineApp, defineStore } = require('@chin0102/mp-core');

const tabs = [
  { pagePath: '/pages/components/index' },
  { pagePath: '/pages/runtime/index' },
];
const renewedRequests = new Set();
const runtimeStats = {
  authentications: 0,
  requests: 0,
  unauthorizedResponses: 0,
};

function mockRequest(options) {
  let aborted = false;
  const timer = setTimeout(() => {
    if (aborted) return;
    runtimeStats.requests += 1;

    if (options.url.includes('/renew-profile') && !renewedRequests.has(options.url)) {
      renewedRequests.add(options.url);
      runtimeStats.unauthorizedResponses += 1;
      options.success({
        statusCode: 401,
        data: { message: '示例 Token 已过期' },
      });
      return;
    }

    options.success({
      statusCode: 200,
      data: {
        method: options.method || 'GET',
        path: options.url,
        authorization: options.header?.Authorization || '',
      },
    });
  }, 150);

  return {
    abort() {
      if (aborted) return;
      aborted = true;
      clearTimeout(timer);
      options.fail?.({ errMsg: 'request:fail abort' });
    },
  };
}

const useDemoStore = defineStore('demo', {
  state: () => ({ count: 0, updatedAt: '尚未更新' }),
  actions: {
    increment() {
      this.setState({
        count: this.state.count + 1,
        updatedAt: new Date().toLocaleTimeString(),
      });
    },
  },
  persist: {
    key: 'appContext-example-store',
    debounce: 200,
  },
});

App(
  defineApp({
    adapter: {
      name: 'wx',
      overwrites: { request: mockRequest },
    },
    tabs,
    setup() {
      const events = createEmitter();
      const preferences = createStorage('appContext-example-preferences', {
        defaults: () => ({ theme: 'light', volume: 50 }),
        debounce: 200,
      });
      const auth = createAuth({
        async authenticate() {
          runtimeStats.authentications += 1;
          await new Promise((resolve) => setTimeout(resolve, 200));
          return {
            accessToken: `example-token-${runtimeStats.authentications}`,
            user: { name: 'Example User' },
          };
        },
      });
      const api = createApiClient({
        baseURL: 'https://example.invalid',
        auth,
      });

      return {
        api,
        auth,
        events,
        preferences,
        getRuntimeStats: () => ({ ...runtimeStats }),
        useDemoStore,
      };
    },
  }),
);

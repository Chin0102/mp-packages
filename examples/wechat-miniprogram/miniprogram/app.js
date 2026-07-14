const { createEmitter } = require('@chin0102/js-common');
const { createStorage, initPlatform } = require('@chin0102/mp-adapter');
const { createApiClient, createAuth, defineStore, initMP } = require('@chin0102/mp-core');

function mockRequest(options) {
  let aborted = false;
  const timer = setTimeout(() => {
    if (aborted) return;
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

initPlatform('wx', { request: mockRequest });
initMP();

const events = createEmitter();
const preferences = createStorage('mp-example-preferences', {
  defaults: () => ({ theme: 'light' }),
  debounce: 200,
});

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
    key: 'mp-example-store',
    debounce: 200,
  },
});

const auth = createAuth({
  async authenticate() {
    return { accessToken: 'example-token', user: { name: 'Example User' } };
  },
});

const api = createApiClient({
  baseURL: 'https://example.invalid',
  auth,
});

App({
  api,
  auth,
  events,
  preferences,
  useDemoStore,
});

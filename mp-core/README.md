# mp-core

同时面向 Node.js 和微信小程序的 JavaScript npm 包。平台能力由 `@chin0102/mp-adapter` 提供；Node.js 使用 ESM 源码入口，微信小程序和 CommonJS 使用预构建的单文件入口 `dist/index.js`。

## 开发

要求 Node.js 20 或更高版本。

```bash
npm install
npm run build
npm run check
npm test
```

公开 API 统一从 `src/index.js` 导出。发布前脚本会自动重新生成 `dist/index.js`，不要直接修改构建产物。

Node.js 同时支持两种加载方式：

```js
import { defineStore } from '@chin0102/mp-core';
const { defineStore } = require('@chin0102/mp-core');
```

## 初始化

可以先显式初始化 adapter：

```js
import { initPlatform } from '@chin0102/mp-adapter';
import { initMP } from '@chin0102/mp-core';

initPlatform('wx');
initMP({ tabs, plugins });
```

也可以在 `initMP` 中统一初始化：

```js
initMP({
  adapter: {
    name: 'my',
    overwrites: platformOverwrites,
  },
  tabs,
  plugins,
});
```

`mp.api` 始终指向当前 adapter。`getEnv` 和 `getSystemInfo` 继续从 `mp-core` 导出，但实现由 `mp-adapter` 提供。

## 导航

```js
import { mp } from '@chin0102/mp-core';

mp.navigate('/pages/detail/index', { id: 1 });
mp.redirect('/pages/login/index', { reason: 'expired' });
mp.reLaunch('/pages/home/index');
mp.back(1);
```

`navigate` 会根据初始化时的 `tabs` 自动选择 `switchTab` 或 `navigateTo`。切换到 tab 页面时不会携带 query。

## Store 持久化

```js
const useSetting = defineStore('setting', {
  state: () => ({
    sound: true,
    volume: 1,
  }),
  persist: {
    key: 'app-setting',
    debounce: 1000,
  },
});
```

`persist` 支持三种形式：

```js
persist: true; // 使用 Store 实例名
persist: 'custom-key'; // 使用指定 key
persist: {
  (key, debounce);
} // 完整配置
```

Store 创建时同步读取已持久化状态并与默认状态合并；状态变化后通过 adapter 的 `createStorage` 保存；销毁前会立即 flush。持久化实例可以通过 `store.$storage` 访问。

## 认证与 API Client

`createAuth` 管理内存会话、合并并发登录，并在多个请求同时失效时只执行一次会话更新。声明式 `login` 配置会依次调用平台 `login()`、检查 code、发送后端登录请求并转换 Session：

```js
import { createApiClient, createAuth } from '@chin0102/mp-core';

const auth = createAuth({
  login: {
    url: `${API_URL}/auth/mp-login`,
    data: ({ code, context }) => ({ code, channel: context.channel }),
    transform: (result) => ({
      accessToken: result.token.key,
      user: result.user,
    }),
  },

  refresh: {
    url: `${API_URL}/auth/refresh`,
    data: ({ session }) => ({ refreshToken: session.refreshToken }),
  },
});

const api = createApiClient({ baseURL: API_URL, auth });

const user = await api.get('/users/me');
await api.post('/orders', { productId: 1 });
await api.get('/public/config', undefined, { auth: false });
```

请求默认等待登录、添加 `Authorization: Bearer <accessToken>`，遇到 HTTP 401 后更新会话并重试一次。`request`、`get`、`post`、`put`、`patch`、`delete` 和 `upload` 使用相同的认证策略。

后端使用其他 Token 字段或业务错误码时可以自定义：

```js
const api = createApiClient({
  baseURL: API_URL,
  auth,
  getAccessToken: (session) => session.token,
  isUnauthorized: (error) => error.code === 10001,
  transformResponse(result) {
    if (result.code !== 0) {
      throw new ApiError(result.message, result.code, result);
    }
    return result.data;
  },
});
```

`initialSession` 和 `onSessionChange` 可用于接入 `createStorage`。库默认不持久化 Token，也不包含具体登录地址、Store 初始化或页面跳转。

`login` 默认使用 `POST`，静态 `data` 会自动合并平台返回的 code。还可以设置 `header`、`timeout`、`transport` 和传给平台登录的 `platform` 参数。没有配置 `refresh` 时，401 会重新执行完整的平台登录。

云函数登录、多阶段认证等特殊流程可以用 `authenticate` 完全接管；`login` 和 `authenticate` 必须且只能提供一个：

```js
const auth = createAuth({
  async authenticate(context) {
    return customAuthenticationFlow(context);
  },
});
```

## Runtime 注入

`getCurrentPages` 和页面选择器是小程序运行时能力，不属于平台 API 对象。其他平台存在差异时可以注入：

```js
initMP({
  runtime: {
    getCurrentPages: () => globalThis.getCurrentPages?.() || [],
    createSelectorQuery: (page) => platform().createSelectorQuery().in(page),
  },
});
```

## 在小程序中本地联调

先在本目录生成 npm 压缩包：

```bash
npm pack
```

然后在小程序项目中安装生成的 `.tgz` 文件：

```bash
npm install /absolute/path/to/mp-core/chin0102-mp-core-0.1.0.tgz
```

在微信开发者工具中开启“使用 npm 模块”，删除旧的 `miniprogram_npm` 后执行“工具 → 构建 npm”，之后从包根入口引入：

```js
import { VERSION } from '@chin0102/mp-core';
```

## 发布

```bash
npm login
npm publish
```

包名已经配置为 `@chin0102/mp-core`，并通过 `publishConfig` 设置为公开发布。

# mp-adapter

同时面向 Node.js 和微信小程序的 JavaScript npm 包。Node.js 使用 ESM 源码入口；微信小程序和 CommonJS 使用预构建的单文件入口 `dist/index.js`。

## 开发

要求 Node.js 20 或更高版本。

```bash
npm install
npm run build
npm run check
npm test
```

公开 API 统一从 `src/index.js` 导出。发布前脚本会自动重新生成 `dist/index.js`，不要直接修改构建产物。内部模块使用 ESM，并在相对导入中保留 `.js` 扩展名：

Node.js 同时支持两种加载方式：

```js
import { VERSION } from 'package.name';
const { VERSION } = require('package.name');
```

## 平台适配

适配器以微信小程序的 API 形状为准。微信小程序只需初始化全局对象名称：

```js
import { initPlatform, platform } from '@chin0102/mp-adapter';

initPlatform('wx');
platform().request({ url: '/api/user' });
```

其他平台通过 `overwrites` 替换有差异的成员；未替换的 API 会透明转发给平台原生对象：

```js
initPlatform('my', {
  request(options) {
    return globalThis.my.request(convertRequestOptions(options));
  },
});
```

`overwrites` 是浅层覆盖对象。覆盖方法中的 `this` 指向适配器，因此可以访问其他覆盖项或原生平台 API。平台后续新增的 API 也会自动透传，无需更新适配器的 API 清单。

## 常用 API

完整的微信式 API 由 `platform()` 透明提供。工具函数只封装需要结果标准化、状态管理或跨平台语义的常用场景。

### 环境和系统

```js
import { getEnv, getSystemInfo } from '@chin0102/mp-adapter';

const env = getEnv();
const system = getSystemInfo();
```

`getSystemInfo()` 在平台原始信息上增加操作系统、安全区、胶囊按钮、导航栏高度、`px2rpx` 和底部安全距离。

### 请求和上传

```js
import { requestData, uploadFile } from '@chin0102/mp-adapter';

const user = await requestData({
  url: '/api/user',
  method: 'GET',
});

const image = await uploadFile({
  url: '/api/upload',
  filePath,
  name: 'file',
});
```

两个函数默认接受 `200-299` 状态码并直接返回 `response.data`，失败时抛出带有 `statusCode` 和原始 `response` 的 `HttpError`。上传响应为 JSON 字符串时会自动解析。也可以自定义状态检查和结果转换：

```js
const status = await requestData(options, {
  validateStatus: (code) => code < 400,
  transform: (response) => response.statusCode,
});
```

返回的 Promise 通过 `.task` 暴露原始 `RequestTask` 或 `UploadTask`：

```js
const pending = requestData(options);
pending.task.abort();
const data = await pending;
```

### 平台登录

```js
import { login } from '@chin0102/mp-adapter';

const { code } = await login({ timeout: 5000 });
```

`login()` 将微信形状的平台登录 API 转为 Promise，其他平台的参数和返回值差异可以通过 `initPlatform` 的 `overwrites.login` 适配。

### 持久化存储

```js
import { createStorage } from '@chin0102/mp-adapter';

const setting = createStorage('setting', {
  defaults: () => ({ sound: true, volume: 1 }),
  debounce: 1000,
});

setting.get();
setting.patch({ volume: 0.5 });
setting.flush();
setting.reload();
setting.remove();

const unsubscribe = setting.subscribe((value, previous) => {
  console.log('setting changed', value, previous);
});
```

`destroy()` 会取消尚未执行的延迟写入并移除监听器，但不会删除已持久化的数据；需要删除数据时使用 `remove()`。

### 权限

```js
import { authorize, getSetting, isAuthorized } from '@chin0102/mp-adapter';

const setting = await getSetting();
const granted = await isAuthorized('scope.camera');
await authorize('scope.camera');
```

`getSetting()` 会缓存成功结果；失败不会污染缓存。使用 `getSetting({ fresh: true })` 可以强制刷新。

### 震动和更新

```js
import { listenForUpdate, vibrate } from '@chin0102/mp-adapter';

await vibrate('light');
await vibrate('medium');
await vibrate('heavy');
await vibrate('long');

const update = listenForUpdate({
  onReady() {
    // 弹窗文案和更新策略由应用决定
  },
  onFailed(error) {
    console.error(error);
  },
});

update?.apply();
update?.dispose();
```

导航、交互、登录、剪贴板、媒体和其他没有额外标准化语义的 API 不重复封装，直接通过 `platform()` 调用。

## 在小程序中本地联调

先在本目录生成 npm 压缩包：

```bash
npm pack
```

然后在小程序项目中安装生成的 `.tgz` 文件：

```bash
npm install /{absolute_path_to_package}/{package.name}-{version}.tgz
```

在微信开发者工具中开启“使用 npm 模块”，删除旧的 `miniprogram_npm` 后执行“工具 → 构建 npm”，之后从包根入口引入：

```js
import { VERSION } from 'package.name';
```

## 发布

```bash
npm login
npm publish
```

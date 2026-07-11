# mp-core

同时面向 Node.js 和微信小程序的 JavaScript npm 包。Node.js 使用 ESM 源码入口；微信小程序和 CommonJS 使用预构建的单文件入口 `index.cjs`。

## 开发

要求 Node.js 20 或更高版本。

```bash
npm install
npm run build
npm run check
npm test
```

公开 API 统一从 `src/index.js` 导出。发布前脚本会自动重新生成 `index.cjs`，不要直接修改构建产物。

Node.js 同时支持两种加载方式：

```js
import { defineStore } from '@chin0102/mp-core';
const { defineStore } = require('@chin0102/mp-core');
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
import { MP_CORE_VERSION } from '@chin0102/mp-core';
```

## 发布

```bash
npm login
npm publish
```

包名已经配置为 `@chin0102/mp-core`，并通过 `publishConfig` 设置为公开发布。

# js-common

面向 Node.js、浏览器和小程序构建流程的通用 JavaScript 工具包。

## 开发

要求 Node.js 20 或更高版本。

```bash
npm run build
npm run check
npm test
```

源码从 `src/index.js` 统一导出。Node.js 使用 ESM 源码入口；CommonJS 使用预构建的 `dist/index.js`。

```js
import { VERSION } from '@chin0102/js-common';
```

## Proxy 工具

```js
import { readonly } from '@chin0102/js-common';

const state = readonly({ user: { name: 'Alice' } });
state.user.name = 'Bob'; // TypeError
```

`readonly()` 为普通对象和数组创建可缓存的深度只读 Proxy。`proxy.js` 作为后续 Proxy 工具的统一模块入口。

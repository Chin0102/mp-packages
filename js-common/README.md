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

## 异步工具

```js
import { deferred, delay, memoizeAsync, settle } from '@chin0102/js-common';

const result = await settle(loadUser());
if (result.ok) console.log(result.value);

const loadCategory = memoizeAsync((id) => api.get(`/categories/${id}`), {
  ttl: 10000,
});

loadCategory.invalidate(1);
loadCategory.clear();
await delay(100);
```

`memoizeAsync()` 会合并同一组参数的并发调用，默认缓存成功结果并在失败后移除缓存。它支持 `ttl`、自定义 `key`、`invalidate()`、`refresh()` 和 `clear()`。

## 集合工具

```js
import { compareByKey, randomInt, sample, sampleSize } from '@chin0102/js-common';

sample(['a', 'b', 'c']);
sampleSize(['a', 'b', 'c'], 2); // 不修改原数组
randomInt(1, 6); // 包含上下界

users.toSorted(compareByKey('score', { descending: true }));
```

`compareBy()` 和 `compareByKey()` 支持 `descending`、`nulls: 'first' | 'last'` 和自定义 `compare`。随机工具可注入随机数函数，便于确定性测试。

## 事件工具

```js
import { createEmitter } from '@chin0102/js-common';

const bus = createEmitter();
const off = bus.on('change', (value) => console.log(value));
bus.once('ready', handler);
bus.emit('change', 1);
off();
```

## 调度工具

```js
import { debounce, throttle } from '@chin0102/js-common';

const save = debounce(persist, 200);
save.cancel();
save.flush();

const update = throttle(render, 50);
```

`debounce()` 和 `throttle()` 都提供 `cancel()`、`flush()` 和 `pending()`。

## URL 工具

```js
import { appendQuery, compactDefined, parseQuery, stringifyQuery } from '@chin0102/js-common';

appendQuery('/pages/detail/index', { id: 1, tag: ['a', 'b'] });
parseQuery('/pages/detail/index?id=1');
```

## Proxy 工具

```js
import { readonly } from '@chin0102/js-common';

const state = readonly({ user: { name: 'Alice' } });
state.user.name = 'Bob'; // TypeError
```

`readonly()` 为普通对象和数组创建可缓存的深度只读 Proxy。`proxy.js` 作为后续 Proxy 工具的统一模块入口。

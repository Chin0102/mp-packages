# mp-packages

面向微信小程序的基础能力仓库。这里沉淀跨项目稳定、业务无关且可以独立测试的能力，不作为完整应用框架使用。

## 包结构

| 包 | 职责 | 依赖 |
| --- | --- | --- |
| `@chin0102/js-common` | 与运行平台无关的 JavaScript 工具 | 无 |
| `@chin0102/mp-adapter` | 小程序平台 API 适配、网络、权限、设备和存储 | 无 |
| `@chin0102/mp-core` | 页面生命周期、Store、认证和 API Client | `js-common`、`mp-adapter` |
| `@chin0102/mp-components` | 原生小程序通用组件 | `mp-adapter` |

依赖方向保持单向：

```text
js-common ────────┐
                  ├─> mp-core
mp-adapter ───────┤
                  └─> mp-components
```

通用算法优先放入 `js-common`；平台 API 封装放入 `mp-adapter`；需要页面、Store 或认证上下文的能力放入 `mp-core`；WXML/WXSS 原生组件放入 `mp-components`。业务数据结构、品牌视觉和单一第三方 SDK 不进入这些包。

## 开发

要求 Node.js 20 或更高版本。

```bash
npm install
npm run verify
```

常用命令：

- `npm test`：运行所有 workspace 测试。
- `npm run check`：构建并执行静态检查。
- `npm run pack:check`：检查运行时版本与包版本，并验证 npm 包内容。
- `npm run example:check`：安装示例的本地依赖并执行集成冒烟测试。
- `npm run verify`：执行提交前的完整验证。

## 版本管理

新增用户可感知的能力或修复时创建 Changeset：

```bash
npm run changeset
npm run changeset:status
```

准备发布时先应用版本和 CHANGELOG，再发布尚未发布的新版本：

```bash
npm run version-packages
npm run publish
```

`version-packages` 会在 Changesets 更新 `package.json` 后同步各包公开的 `VERSION` 常量并重新构建。不要只手工修改其中一处版本。

## 示例小程序

[`examples/wechat-miniprogram`](./examples/wechat-miniprogram) 是独立的消费端验证项目，覆盖四个包的本地安装、核心运行链路和全部原生组件。

```bash
npm run build
npm run example:install
```

然后使用微信开发者工具打开 `examples/wechat-miniprogram`，执行“工具 → 构建 npm”后即可预览。示例通过 `file:` 依赖引用当前仓库中的包，不依赖已发布版本。

## 发布

发布前先执行：

```bash
npm run verify
```

正式发布使用 `npm run publish`。脚本按照 `js-common`、`mp-adapter`、`mp-core`、`mp-components` 的依赖顺序处理各包。

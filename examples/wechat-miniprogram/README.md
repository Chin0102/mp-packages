# 微信小程序验证项目

该项目是 `mp-packages` 的独立消费端，用于验证本地 npm 安装、微信开发者工具构建、组件样式覆盖和核心运行链路。

## 使用

在仓库根目录执行：

```bash
npm run build
npm run example:install
```

然后：

1. 使用微信开发者工具打开本目录。
2. 执行“工具 → 构建 npm”。
3. 编译并通过底部自定义 tab 查看“组件”和“运行时”两个页面。

本项目使用 `touristappid`，无需配置真实 AppID 即可用于本地预览。`miniprogram_npm` 是开发者工具生成的目录，不提交到仓库。

## 覆盖范围

- 组件页：`mp-navigation`、`mp-page-bottom`、`mp-countdown`、`mp-overlay`、`mp-popup`、`mp-dialog`。
- 运行时页：`js-common` 事件、`mp-adapter` 平台与存储、`mp-core` 页面生命周期、Store、认证和 API Client。
- 自定义 tabBar：使用小程序 `switchTab` 在组件页和运行时页之间切换，页面导航栏只展示标题。
- `npm run example:check`：检查页面文件、npm 包解析和模拟小程序环境下的核心调用。

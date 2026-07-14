# mp-components

面向微信小程序的原生组件包。组件负责设备安全区和基础布局，颜色、背景、按钮及业务内容由使用方通过 slot、外部样式类和 `custom-style` 控制。

组件依赖 `@chin0102/mp-adapter` 获取同步设备信息。使用组件前应通过 `initPlatform()` 或 `initMP()` 初始化平台。

## 开发

要求 Node.js 20 或更高版本。

```bash
npm install
npm run build
npm run check
npm test
```

构建脚本会将组件 JavaScript 构建为 CommonJS，并将 WXML、WXSS 和 JSON 原样复制到 `dist`。不要直接修改 `dist`。

## 注册组件

安装依赖并在微信开发者工具中执行“构建 npm”后注册：

```json
{
  "usingComponents": {
    "mp-navigation": "@chin0102/mp-components/mp-navigation/index",
    "mp-countdown": "@chin0102/mp-components/mp-countdown/index",
    "mp-page-bottom": "@chin0102/mp-components/mp-page-bottom/index",
    "mp-overlay": "@chin0102/mp-components/mp-overlay/index",
    "mp-popup": "@chin0102/mp-components/mp-popup/index",
    "mp-dialog": "@chin0102/mp-components/mp-dialog/index"
  }
}
```

## mp-countdown

基于真实截止时间计算的倒计时，避免定时器节流造成累计误差：

```xml
<mp-countdown
  duration="{{10 * 60 * 1000}}"
  format="mm:ss"
  bindtick="onTick"
  bindfinish="onFinish"
/>
```

`duration` 单位为毫秒；也可以传入毫秒时间戳 `target-time`，此时绝对时间优先。组件公开 `start()`、`pause()` 和 `reset()` 方法，并支持：

- `auto-start`：挂载或重置后自动开始，默认 `true`。
- `paused`：声明式暂停和继续。
- `pause-on-hide`：页面隐藏时暂停 duration 倒计时；绝对 `target-time` 恢复后仍以真实时间为准。
- `interval`：刷新间隔，默认 `250ms`。
- `format`：支持 `DD`、`HH`、`mm`、`ss`；没有 `DD` 时 `HH` 表示累计小时。
- `custom-class`、`text-class` 和 `custom-style`：样式扩展。
- `prefix`、`suffix`：前后缀具名 slot。

`tick` 事件包含 `remaining`、分段时间和 `formatted`；倒计时归零时只触发一次 `finish`。

## mp-navigation

根据状态栏及微信胶囊按钮的位置生成顶部导航布局。

```xml
<mp-navigation fixed placeholder>
  <view slot="background" class="navigation-background"></view>
  <view class="navigation-actions">返回</view>
</mp-navigation>
```

```css
.navigation-background {
  width: 100%;
  height: 100%;
  background: #fff;
}
```

属性：

- `fixed`：固定到页面顶部，默认 `false`。
- `placeholder`：`fixed` 时保留等高文档流占位，默认 `false`。
- `padding-left`：左侧内边距，单位为 rpx；默认与胶囊右侧留白一致。
- `pd-left`：保留旧组件的属性名，用于兼容迁移。
- `z-index`：固定导航层级，默认 `10`。
- `custom-style`：追加到导航根节点的内联样式。

样式扩展类：

- `custom-class`：导航根节点。
- `content-class`：导航内容行。
- `background-class`：背景层。

背景使用具名 `background` slot，默认 slot 放置导航内容。

### 滚动背景透明度

页面可以继续使用配套 Behavior：

```js
import OpacityWithScroll from '@chin0102/mp-components/mp-navigation/opacity-with-scroll';

Page({
  behaviors: [OpacityWithScroll],
});
```

Behavior 提供 `navBgOpacity`、`onScrollTop`、`onScroll` 和 `onPageScroll`。默认在滚动 `200px` 后达到完全不透明，并以 `50ms` 间隔节流；可以通过页面数据 `navFadeDistance` 和 `navThrottleInterval` 调整。

## mp-page-bottom

生成底部安全区占位，高度计算为：

```text
max(设备底部安全距离, min) + append
```

```xml
<mp-page-bottom min="{{40}}" append="{{100}}"></mp-page-bottom>
```

`min` 和 `append` 的单位都是 rpx。组件还提供默认 slot、`custom-class` 外部样式类和 `custom-style` 属性。

## mp-overlay

通用全屏遮罩，支持透明度、背景色、层级、点击关闭请求和滚动锁定：

```xml
<mp-overlay
  visible="{{visible}}"
  opacity="{{0.5}}"
  close-on-tap
  bindclose="onClose"
></mp-overlay>
```

点击时触发 `tap`；启用 `close-on-tap` 时同时触发 `close`，事件详情为 `{ source: 'overlay' }`。组件不会直接修改 `visible`。

## mp-popup

基于 `mp-overlay` 的弹层容器：

```xml
<mp-popup
  visible="{{visible}}"
  position="bottom"
  round
  close-on-overlay
  bindclose="onClose"
>
  <view class="sheet-content">...</view>
</mp-popup>
```

`position` 支持 `center`、`top`、`right`、`bottom` 和 `left`。常用属性还包括 `duration`、`z-index`、`overlay`、`overlay-opacity`、`overlay-color`、`overlay-style` 和 `custom-style`。

样式扩展类包括 `custom-class`、`content-class` 和 `overlay-class`。点击遮罩会触发 `overlaytap`，允许关闭时再触发 `close`。

## mp-dialog

基于 `mp-popup` 的中性对话框：

```xml
<mp-dialog
  visible="{{visible}}"
  title="提示"
  content="确定继续吗？"
  bindcancel="onCancel"
  bindconfirm="onConfirm"
  bindclose="onClose"
></mp-dialog>
```

组件提供默认内容 slot、`header` 和 `footer` 具名 slot。设置 `show-actions="{{false}}"` 后可以完全自定义 footer。确认、取消和遮罩操作统一通过 `close` 事件的 `source` 区分，组件不会自行修改 `visible`。

## 本地联调

在 `mp-packages` 仓库根目录执行：

```bash
npm run dev:publish
```

在小程序项目中通过 yalc 安装后，需要重新执行微信开发者工具的“构建 npm”。

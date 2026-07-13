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
    "mp-page-bottom": "@chin0102/mp-components/mp-page-bottom/index"
  }
}
```

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

## 本地联调

在 `mp-packages` 仓库根目录执行：

```bash
npm run dev:publish
```

在小程序项目中通过 yalc 安装后，需要重新执行微信开发者工具的“构建 npm”。

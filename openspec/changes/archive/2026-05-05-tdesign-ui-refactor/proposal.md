## Why

当前德州记分板小程序使用 Vant Weapp（v1.11.7）作为 UI 组件库。虽然之前的 Vant 重构已经完成，但存在以下问题：

1. **Vant Weapp 维护力度下降**：有赞团队已减少对该库的维护投入，长期来看存在风险
2. **视觉风格偏电商**：Vant 的设计语言偏向电商场景，与德州扑克的游戏氛围不匹配
3. **不支持暗黑模式**：德州扑克天然适合暗色主题（深色赌桌风格），Vant 不原生支持 Dark Mode
4. **主题定制能力有限**：Vant 的 CSS 变量体系不够完整，难以实现深度主题定制
5. **UI 不够炫酷**：用户反馈当前 UI 不够好看，需要更现代、更有质感的视觉效果

TDesign 小程序版（`tdesign-miniprogram`）是腾讯官方出品的设计系统，原生支持暗黑模式、完整的 CSS 变量主题定制、更现代的设计语言，且持续活跃维护，是理想的替代方案。

## What Changes

- **替换 UI 组件库**：从 `@vant/weapp` 迁移到 `tdesign-miniprogram`
- **启用暗黑模式**：利用 TDesign 的 Dark Mode 能力，打造深色赌桌风格的沉浸式界面
- **全局主题定制**：通过 CSS 变量体系定制品牌色（主色 `#e94560`）、圆角、间距等设计 Token
- **组件一对一替换**：
  - `van-button` → `t-button`
  - `van-dialog` → `t-dialog`
  - `van-tag` → `t-tag`
  - `van-field` → `t-input`
  - `van-empty` → `t-empty`
  - `van-skeleton` → `t-skeleton`
  - `van-toast` → `t-toast` / `t-message`
  - `van-tabs` / `van-tab` → `t-tabs` / `t-tab-panel`
- **增强视觉效果**：利用 TDesign 的动画系统和更精致的组件设计提升整体质感
- **导航栏升级**：使用 TDesign 的自定义 Navbar 组件实现更炫酷的顶部导航
- **卡片样式升级**：利用 TDesign 的 Cell / Grid 等组件重构信息展示卡片

## Capabilities

### New Capabilities
- `tdesign-infrastructure`: TDesign 小程序版 npm 安装、project.config.json 配置、npm 构建、暗黑模式全局配置
- `tdesign-theme`: 基于 CSS 变量的全局主题定制（暗色赌桌风格），包括品牌色、背景色、文字色、圆角、阴影等设计 Token
- `tdesign-component-migration`: 将所有页面的 Vant 组件替换为 TDesign 对应组件，适配 API 差异

### Modified Capabilities
_(无现有 specs 需要修改)_

## Impact

- **依赖变更**：移除 `@vant/weapp`，新增 `tdesign-miniprogram` 生产依赖
- **npm 构建产物变更**：`miniprogram_npm/@vant/` 替换为 `miniprogram_npm/tdesign-miniprogram/`
- **配置变更**：`project.config.json` 的 `packNpmRelationList` 需更新
- **全局样式变更**：
  - `app.wxss` 需引入 TDesign 基础样式和暗黑模式变量
  - `app.json` 的 `window` 配置需适配暗色主题（导航栏背景色等）
- **页面文件变更**（所有使用 Vant 组件的页面）：
  - `pages/index/index` — wxml（button、skeleton、toast）、json（组件注册）
  - `pages/group/list/` — wxml（dialog、button、tag、empty、skeleton、toast）、js（Toast/Dialog API 适配）、json
  - `subpages/group/detail/` — wxml（button、tag、empty、tabs、toast）、js（Tabs 事件适配）、json
  - `subpages/group/create/` — wxml（button、field→input、toast）、json
  - `subpages/match/detail/` — wxml（dialog、button、tag、toast）、js（Dialog API 适配）、json
  - `subpages/match/create/` — wxml（button、field→input、toast）、json
  - `subpages/score/input/` — wxml（button、field→input、toast）、json
  - `subpages/rules/edit/` — wxml（button、field→input、toast）、json
  - `subpages/member/detail/` — wxml（empty）、json
  - `subpages/login/login` — 可选改造（增加 TDesign 按钮）
- **JS 逻辑适配**：
  - Toast API：`import Toast from '@vant/weapp/toast/toast'` → TDesign 的 `MessagePlugin` 或 `Toast`
  - Dialog API：Vant 的 `close` 事件 → TDesign 的 `confirm` / `cancel` 事件
  - Tabs API：Vant 的 `change` 事件 → TDesign 的 `change` 事件（参数格式可能不同）
- **E2E 测试**：组件标签名和属性变化会影响自动化测试的元素选择器，需全面回归
- **包体积**：TDesign 支持按需引入，预期体积与 Vant 相当（~150KB）

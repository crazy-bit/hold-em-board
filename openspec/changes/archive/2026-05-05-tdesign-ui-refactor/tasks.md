## 1. 基础设施搭建

- [x] 1.1 执行 `npm i tdesign-miniprogram -S --production` 安装 TDesign 小程序版依赖
- [ ] 1.2 在微信开发者工具中执行"工具 → 构建 npm"，验证 `miniprogram_npm/tdesign-miniprogram/` 目录生成成功
- [x] 1.3 在 `app.wxss` 中引入 TDesign 基础样式：`@import './miniprogram_npm/tdesign-miniprogram/common/style/theme.wxss';`

## 2. 暗黑主题配置

- [x] 2.1 在 `app.wxss` 的 `page` 选择器中添加 TDesign 暗黑模式 CSS 变量覆盖：
  - `--td-brand-color: #e94560`（品牌红）
  - `--td-bg-color-page: #0f0f23`（页面背景-深蓝黑）
  - `--td-bg-color-container: #1a1a2e`（容器背景-深蓝）
  - `--td-bg-color-secondarycontainer: #16213e`（次级容器背景）
  - `--td-text-color-primary: #eaeaea`（主文字色）
  - `--td-text-color-secondary: #a0a0b0`（次文字色）
  - `--td-text-color-placeholder: #666680`（占位文字色）
  - `--td-success-color: #4caf50`、`--td-error-color: #f44336`、`--td-warning-color: #FFD700`
- [x] 2.2 更新 `app.wxss` 中的全局样式适配暗色主题：
  - `page` 的 `background-color` 改为 `#0f0f23`，`color` 改为 `#eaeaea`
  - `.container` 背景透明
  - `.card` 的 `background` 改为 `#1a1a2e`，`box-shadow` 改为暗色阴影，`color` 改为 `#eaeaea`
  - `.page-title`、`.section-title` 的颜色改为浅色
  - `.divider` 的颜色改为 `rgba(255,255,255,0.08)`
  - `.loading-wrap` 的颜色适配暗色
- [x] 2.3 更新 `app.json` 的 `window` 配置：
  - `backgroundColor` 改为 `#0f0f23`
  - `navigationBarBackgroundColor` 保持 `#1a1a2e`（已是暗色）
  - `backgroundTextStyle` 改为 `dark`
- [x] 2.4 更新 `app.json` 的 `tabBar` 配置适配暗色：
  - `backgroundColor` 改为 `#1a1a2e`
  - `borderStyle` 改为 `black`
  - `color` 改为 `#666680`
  - `selectedColor` 保持 `#e94560`

## 3. Sprint 1 — Button 替换（van-button → t-button）

- [x] 3.1 在 `pages/index/index.json` 中将 `van-button` 注册替换为 `"t-button": "tdesign-miniprogram/button/button"`
- [x] 3.2 在 `pages/index/index.wxml` 中将 `<van-button>` 替换为 `<t-button>`，适配属性：
  - `type="danger"` → `theme="danger"`
  - `plain` → `variant="outline"`
  - `round` → `shape="round"`
  - `block` → `block`（相同）
  - `custom-style` → `style`
- [x] 3.3 在 `pages/group/list/list.json` 中替换 `van-button` 注册为 `t-button`
- [x] 3.4 在 `pages/group/list/list.wxml` 中替换所有 `<van-button>` 为 `<t-button>`
- [x] 3.5 在 `subpages/group/detail/detail.json` 中替换 `van-button` 注册为 `t-button`
- [x] 3.6 在 `subpages/group/detail/detail.wxml` 中替换所有 `<van-button>` 为 `<t-button>`
- [x] 3.7 在 `subpages/group/create/create.json` 中替换 `van-button` 注册为 `t-button`
- [x] 3.8 在 `subpages/group/create/create.wxml` 中替换所有 `<van-button>` 为 `<t-button>`
- [x] 3.9 在 `subpages/match/detail/detail.json` 中替换 `van-button` 注册为 `t-button`
- [x] 3.10 在 `subpages/match/detail/detail.wxml` 中替换所有 `<van-button>` 为 `<t-button>`
- [x] 3.11 在 `subpages/match/create/create.json` 中替换 `van-button` 注册为 `t-button`
- [x] 3.12 在 `subpages/match/create/create.wxml` 中替换所有 `<van-button>` 为 `<t-button>`
- [x] 3.13 在 `subpages/score/input/input.json` 中替换 `van-button` 注册为 `t-button`
- [x] 3.14 在 `subpages/score/input/input.wxml` 中替换所有 `<van-button>` 为 `<t-button>`
- [x] 3.15 在 `subpages/rules/edit/edit.json` 中替换 `van-button` 注册为 `t-button`
- [x] 3.16 在 `subpages/rules/edit/edit.wxml` 中替换所有 `<van-button>` 为 `<t-button>`

## 4. Sprint 1 — Tag 替换（van-tag → t-tag）

- [x] 4.1 在 `pages/group/list/list.json` 中替换 `van-tag` 注册为 `"t-tag": "tdesign-miniprogram/tag/tag"`
- [x] 4.2 在 `pages/group/list/list.wxml` 中将 `<van-tag>` 替换为 `<t-tag>`，适配属性：
  - `type="warning"` → `theme="warning"`
  - `round` → `shape="round"`
- [x] 4.3 在 `subpages/group/detail/detail.json` 中替换 `van-tag` 注册为 `t-tag`
- [x] 4.4 在 `subpages/group/detail/detail.wxml` 中替换所有 `<van-tag>` 为 `<t-tag>`，适配状态标签：
  - `type="success"` → `theme="success"`
  - `type="primary"` → `theme="primary"`
  - 自定义颜色标签：`color="#fafafa" text-color="#999"` → `theme="default"` 或使用 `style` 自定义
- [x] 4.5 在 `subpages/match/detail/detail.json` 中替换 `van-tag` 注册为 `t-tag`
- [x] 4.6 在 `subpages/match/detail/detail.wxml` 中替换所有 `<van-tag>` 为 `<t-tag>`

## 5. Sprint 1 — Skeleton 替换（van-skeleton → t-skeleton）

- [x] 5.1 在 `pages/index/index.json` 中替换 `van-skeleton` 注册为 `"t-skeleton": "tdesign-miniprogram/skeleton/skeleton"`
- [x] 5.2 在 `pages/index/index.wxml` 中将 `<van-skeleton title row="3" loading="{{loading}}">` 替换为 `<t-skeleton theme="paragraph" loading="{{loading}}" />`
- [x] 5.3 在 `pages/group/list/list.json` 中替换 `van-skeleton` 注册为 `t-skeleton`
- [x] 5.4 在 `pages/group/list/list.wxml` 中替换 `<van-skeleton>` 为 `<t-skeleton>`

## 6. Sprint 1 — 暗色样式适配

- [x] 6.1 更新 `pages/index/index.wxss` 中的自定义样式适配暗色主题
- [x] 6.2 更新 `pages/group/list/list.wxss` 中的自定义样式适配暗色主题
- [x] 6.3 更新 `subpages/group/detail/detail.wxss` 中的自定义样式适配暗色主题
- [x] 6.4 更新 `subpages/match/detail/detail.wxss` 中的自定义样式适配暗色主题
- [x] 6.5 更新 `subpages/member/detail/detail.wxss` 中的自定义样式适配暗色主题
- [x] 6.6 更新 `subpages/score/input/input.wxss` 中的自定义样式适配暗色主题
- [x] 6.7 更新 `subpages/group/create/create.wxss` 中的自定义样式适配暗色主题
- [x] 6.8 更新 `subpages/match/create/create.wxss` 中的自定义样式适配暗色主题
- [x] 6.9 更新 `subpages/rules/edit/edit.wxss` 中的自定义样式适配暗色主题
- [x] 6.10 更新 `subpages/login/login.wxss` 中的自定义样式适配暗色主题

## 7. Sprint 1 — 验证

- [ ] 7.1 在微信开发者工具中预览所有页面，验证暗黑主题视觉效果
- [ ] 7.2 验证 Button、Tag、Skeleton 组件显示和交互正常
- [ ] 7.3 执行 E2E 测试回归，修复因组件标签名变化导致的选择器问题

## 8. Sprint 2 — Dialog 替换（van-dialog → t-dialog）

- [x] 8.1 在 `pages/group/list/list.json` 中替换 `van-dialog` 注册为 `"t-dialog": "tdesign-miniprogram/dialog/dialog"`
- [x] 8.2 在 `pages/group/list/list.wxml` 中将加入赛事弹窗从 `<van-dialog>` 替换为 `<t-dialog>`
- [x] 8.3 在 `pages/group/list/list.js` 中适配 TDesign Dialog 的事件 API
- [x] 8.4 在 `subpages/match/detail/detail.json` 中替换 `van-dialog` 注册为 `t-dialog`
- [x] 8.5 在 `subpages/match/detail/detail.wxml` 中将结束赛程弹窗替换为 `<t-dialog>`
- [x] 8.6 在 `subpages/match/detail/detail.js` 中适配 TDesign Dialog 的事件 API

## 9. Sprint 2 — Input 替换（van-field → t-input）

- [x] 9.1 在 `subpages/group/create/create.json` 中替换 `van-field` 注册为 `"t-input": "tdesign-miniprogram/input/input"`
- [x] 9.2 在 `subpages/group/create/create.wxml` 中将 `<van-field>` 替换为 `<t-input>`
- [x] 9.3 在 `subpages/match/create/create.json` 中替换 `van-field` 注册为 `t-input`
- [x] 9.4 在 `subpages/match/create/create.wxml` 中替换 `<van-field>` 为 `<t-input>`
- [x] 9.5 在 `subpages/score/input/input.json` 中替换 `van-field` 注册为 `t-input`
- [x] 9.6 在 `subpages/score/input/input.wxml` 中替换 `<van-field>` 为 `<t-input>`
- [x] 9.7 在 `subpages/rules/edit/edit.json` 中替换 `van-field` 注册为 `t-input`
- [x] 9.8 在 `subpages/rules/edit/edit.wxml` 中替换 `<van-field>` 为 `<t-input>`

## 10. Sprint 2 — Empty 替换（van-empty → t-empty）

- [x] 10.1 在 `pages/group/list/list.json` 中替换 `van-empty` 注册为 `"t-empty": "tdesign-miniprogram/empty/empty"`
- [x] 10.2 在 `pages/group/list/list.wxml` 中将 `<van-empty>` 替换为 `<t-empty>`
- [x] 10.3 在 `subpages/group/detail/detail.json` 中替换 `van-empty` 注册为 `t-empty`
- [x] 10.4 在 `subpages/group/detail/detail.wxml` 中替换所有 `<van-empty>` 为 `<t-empty>`
- [x] 10.5 在 `subpages/member/detail/detail.json` 中替换 `van-empty` 注册为 `t-empty`
- [x] 10.6 在 `subpages/member/detail/detail.wxml` 中替换 `<van-empty>` 为 `<t-empty>`

## 11. Sprint 2 — Toast 替换（van-toast → t-toast）

- [x] 11.1 在所有使用 `van-toast` 的页面 JSON 中替换注册为 `"t-toast": "tdesign-miniprogram/toast/toast"`
- [x] 11.2 在所有页面 WXML 中将 `<van-toast id="van-toast" />` 替换为 `<t-toast id="t-toast" />`
- [x] 11.3 在 `pages/group/list/list.js` 中将 `import Toast from '@vant/weapp/toast/toast'` 替换为 TDesign Toast 的引入方式，适配调用 API
- [x] 11.4 在 `subpages/group/detail/detail.js` 中替换 Toast 调用
- [x] 11.5 在 `subpages/group/create/create.js` 中替换 Toast 调用
- [x] 11.6 在 `subpages/match/detail/detail.js` 中替换 Toast 调用
- [x] 11.7 在 `subpages/match/create/create.js` 中替换 Toast 调用
- [x] 11.8 在 `subpages/score/input/input.js` 中替换 Toast 调用
- [x] 11.9 在 `subpages/rules/edit/edit.js` 中替换 Toast 调用
- [x] 11.10 在 `pages/index/index.js` 中替换 Toast 调用（如有）

## 12. Sprint 2 — 验证

- [ ] 12.1 在微信开发者工具中预览所有改造页面，验证 Dialog、Input、Empty、Toast 显示和交互正常
- [ ] 12.2 执行 E2E 测试回归

## 13. Sprint 3 — Tabs 替换（van-tabs → t-tabs）

- [x] 13.1 在 `subpages/group/detail/detail.json` 中替换 `van-tabs` 和 `van-tab` 注册为 `"t-tabs": "tdesign-miniprogram/tabs/tabs"` 和 `"t-tab-panel": "tdesign-miniprogram/tab-panel/tab-panel"`
- [x] 13.2 在 `subpages/group/detail/detail.wxml` 中将 `<van-tabs>` / `<van-tab>` 替换为 `<t-tabs>` / `<t-tab-panel>`
- [x] 13.3 在 `subpages/group/detail/detail.js` 中适配 TDesign Tabs 的 `change` 事件参数格式

## 14. Sprint 3 — 清理 Vant 残留

- [x] 14.1 执行 `npm uninstall @vant/weapp` 移除 Vant 依赖
- [x] 14.2 删除 `miniprogram_npm/@vant/` 目录
- [ ] 14.3 在微信开发者工具中重新构建 npm
- [x] 14.4 全局搜索确认无残留的 `van-` 组件引用（JSON 注册、WXML 标签、JS 导入）
- [x] 14.5 全局搜索确认无残留的 `@vant/weapp` 路径引用

## 15. Sprint 3 — 全局样式优化

- [x] 15.1 优化 `.card` 的暗色阴影效果，使用 `box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.3)` 增加层次感
- [x] 15.2 为排名徽章（`.rank-gold`、`.rank-silver`、`.rank-bronze`）添加微光效果
- [x] 15.3 优化 `.input-field`（如仍有使用）的暗色样式
- [x] 15.4 更新 `components/trend-chart/trend-chart.wxss` 和 `trend-chart.js` 中的颜色配置适配暗色背景
- [x] 15.5 清理 `app.wxss` 中不再需要的旧样式类

## 16. Sprint 3 — 最终验证

- [ ] 16.1 在微信开发者工具中全面预览所有页面，验证暗黑主题一致性
- [ ] 16.2 执行完整 E2E 测试回归，修复所有因迁移导致的问题
- [ ] 16.3 在微信开发者工具中检查包体积，确认总大小在合理范围内（预期 < 300KB）
- [x] 16.4 验证 Vant 已完全移除，无残留引用

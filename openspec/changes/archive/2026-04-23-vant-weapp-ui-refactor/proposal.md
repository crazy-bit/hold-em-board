## Why

当前德州记分板小程序的 UI 体验较差：弹窗全部手写无动画过渡、反馈机制缺失、表单组件原始、列表交互单一、自定义组件极少（仅 1 个 loading 组件）。经过对 Vant Weapp（v1.11.7）的深度分析和可行性评估，引入该组件库可以以极低的成本（按需引入约 128KB）全面提升 UI 质量，且与现有代码零冲突。

## What Changes

- **引入 Vant Weapp 组件库**：通过 npm 安装 `@vant/weapp`，配置 `project.config.json` 的 npm 构建选项
- **弹窗系统重构**：将 3 处手写 `modal-mask` + `modal-card` 弹窗替换为 `van-dialog`，获得动画过渡和 Promise API
- **按钮组件升级**：将全部页面的原生 `<button>` 替换为 `van-button`，支持 loading 状态、多种类型和点击反馈
- **标签组件升级**：将手写的状态标签（进行中/已结束/已作废/管理员）替换为 `van-tag`
- **表单输入升级**：将原生 `<input>` 替换为 `van-field`，支持浮动标签、错误提示
- **信息展示升级**：在分数录入、成员详情等页面使用 `van-cell` 替代手写信息行
- **空状态升级**：将 emoji + 文字的手写空状态替换为 `van-empty`
- **加载状态升级**：引入 `van-skeleton` 骨架屏替代简单的"加载中..."文字
- **反馈系统统一**：引入 `van-toast` 替代分散的 `wx.showToast` 调用
- **Tab 组件升级**：将组详情页的手写 Tab 切换替换为 `van-tabs`
- **保留分数表格现有实现**：match/detail 的 5 列分数表格不适合用 Cell 替代，保持原有 flex 布局
- **保留原生 TabBar**：底部导航栏保持原生配置，不使用 Vant Tabbar

## Capabilities

### New Capabilities
- `vant-infrastructure`: Vant Weapp npm 安装、project.config.json 配置、npm 构建设置
- `dialog-system`: 使用 van-dialog 替换所有手写弹窗（加入记分组弹窗、结束赛程弹窗）
- `ui-components`: 使用 van-button、van-tag、van-field、van-cell、van-empty、van-skeleton、van-toast、van-tabs 替换现有原始 UI 组件

### Modified Capabilities
_(无现有 specs 需要修改)_

## Impact

- **依赖变更**：新增 `@vant/weapp` 生产依赖（~128KB 按需引入）
- **配置变更**：`project.config.json` 需配置 `packNpmManually: true` 和 `packNpmRelationList`
- **页面文件变更**：
  - `pages/group/list/` — wxml（弹窗+空状态+加载）、wxss（删除弹窗样式）、js（弹窗逻辑适配）、json（注册组件）
  - `pages/group/detail/` — wxml（标签+Tab+空状态+按钮）、wxss、js、json
  - `pages/group/create/` — wxml（输入框+按钮）、json
  - `pages/match/detail/` — wxml（弹窗+标签+按钮）、wxss（删除弹窗样式）、js（弹窗逻辑适配）、json
  - `pages/match/create/` — wxml（输入框+按钮）、json
  - `pages/score/input/` — wxml（输入框+Cell+按钮）、json
  - `pages/rules/edit/` — wxml（输入框+按钮）、json
  - `pages/member/detail/` — wxml（Cell+标签）、json
  - `pages/login/login` — 不改造（页面简单，收益低）
  - `pages/index/index` — 不改造
- **全局样式**：`app.wxss` 中的 `.btn-primary`、`.btn-secondary`、`.btn-danger`、`.input-field` 等类可在全部页面迁移完成后清理，过渡期保留
- **E2E 测试**：弹窗交互方式变化可能影响自动化测试的元素选择器和时序，需每阶段回归验证
- **自定义组件**：`components/loading` 可在引入 `van-loading`/`van-skeleton` 后废弃

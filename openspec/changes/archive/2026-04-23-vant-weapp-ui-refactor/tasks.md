## 1. 基础设施搭建

- [x] 1.1 执行 `npm i @vant/weapp -S --production` 安装 Vant Weapp 依赖
- [x] 1.2 修改 `project.config.json`：设置 `setting.packNpmManually` 为 `true`，添加 `setting.packNpmRelationList` 配置项（packageJsonPath: `"./package.json"`, miniprogramNpmDistDir: `"./"`）
- [x] 1.3 在微信开发者工具中执行"工具 → 构建 npm"，验证 `miniprogram_npm/@vant/weapp/` 目录生成成功
- [x] 1.4 在 `.gitignore` 中添加 `miniprogram_npm/` 目录（构建产物不入库）

## 2. Sprint 1 — 弹窗替换

- [x] 2.1 在 `pages/group/list/list.json` 中注册 `van-dialog` 和 `van-button` 组件
- [x] 2.2 改造 `pages/group/list/list.wxml`：将手写的加入记分组弹窗（modal-mask + modal-card）替换为 `<van-dialog use-slot show="{{showJoinModal}}">`，内部保留邀请码输入框的特殊样式
- [x] 2.3 改造 `pages/group/list/list.js`：适配 van-dialog 的 `close` 事件和 `before-close` 回调，保持 confirmJoin 逻辑不变
- [x] 2.4 清理 `pages/group/list/list.wxss` 中的 `.modal-mask`、`.modal-card`、`.modal-title` 样式
- [x] 2.5 在 `pages/match/detail/detail.json` 中注册 `van-dialog` 和 `van-button` 组件
- [x] 2.6 改造 `pages/match/detail/detail.wxml`：将手写的结束赛程弹窗替换为 `<van-dialog use-slot>`，内部保留未填写成员警告区域
- [x] 2.7 改造 `pages/match/detail/detail.js`：适配 van-dialog 的事件回调
- [x] 2.8 清理 `pages/match/detail/detail.wxss` 中的弹窗相关样式

## 3. Sprint 1 — 按钮替换

- [x] 3.1 在 `pages/group/list/list.wxml` 中将 `<button class="btn-primary">` 和 `<button class="btn-secondary">` 替换为对应的 `<van-button>` 组件
- [x] 3.2 在 `pages/group/detail/detail.wxml` 中将"创建新赛程"按钮替换为 `<van-button type="danger" block round>`
- [x] 3.3 在 `pages/group/detail/detail.json` 中注册 `van-button` 组件
- [x] 3.4 在 `pages/match/detail/detail.wxml` 中将"结束赛程"和"销毁赛程"按钮替换为 `<van-button>`
- [x] 3.5 在 `pages/match/create/create.json` 中注册 `van-button`，替换创建赛程页面的按钮
- [x] 3.6 在 `pages/match/create/create.wxml` 中替换按钮为 `<van-button>`
- [x] 3.7 在 `pages/group/create/create.json` 中注册 `van-button`，替换创建记分组页面的按钮
- [x] 3.8 在 `pages/group/create/create.wxml` 中替换按钮为 `<van-button>`
- [x] 3.9 在 `pages/score/input/input.json` 中注册 `van-button`，替换保存按钮
- [x] 3.10 在 `pages/score/input/input.wxml` 中替换保存按钮为 `<van-button type="danger" block round loading="{{saving}}">`
- [x] 3.11 在 `pages/rules/edit/edit.json` 中注册 `van-button`，替换保存规则按钮
- [x] 3.12 在 `pages/rules/edit/edit.wxml` 中替换保存按钮为 `<van-button>`

## 4. Sprint 1 — 标签替换

- [x] 4.1 在 `pages/group/detail/detail.json` 中注册 `van-tag` 组件
- [x] 4.2 在 `pages/group/detail/detail.wxml` 中将手写的状态标签（进行中/已结束/已作废）替换为 `<van-tag>` 组件
- [x] 4.3 在 `pages/group/detail/detail.wxml` 中将管理员标签替换为 `<van-tag type="warning" round>`（如果 group/list 中也有管理员标签则一并替换）
- [x] 4.4 在 `pages/group/list/list.json` 中注册 `van-tag` 组件（如需要）
- [x] 4.5 在 `pages/match/detail/detail.json` 中注册 `van-tag` 组件
- [x] 4.6 在 `pages/match/detail/detail.wxml` 中将赛程状态标签替换为 `<van-tag>`

## 5. Sprint 1 — 验证

- [x] 5.1 在微信开发者工具中预览所有改造页面，验证弹窗动画、按钮样式、标签显示正常
- [x] 5.2 执行 E2E 测试回归，检查弹窗交互流程是否正常
- [x] 5.3 修复 E2E 测试中因弹窗改造导致的选择器或时序问题

## 6. Sprint 2 — 输入框替换

- [x] 6.1 在 `pages/score/input/input.json` 中注册 `van-field` 和 `van-cell-group` 组件
- [x] 6.2 在 `pages/score/input/input.wxml` 中将原生 `<input>` 替换为 `<van-field type="number" label="结算筹码">`
- [x] 6.3 在 `pages/group/create/create.json` 中注册 `van-field` 组件
- [x] 6.4 在 `pages/group/create/create.wxml` 中将组名输入框替换为 `<van-field>`
- [x] 6.5 在 `pages/match/create/create.json` 中注册 `van-field` 组件
- [x] 6.6 在 `pages/match/create/create.wxml` 中将赛程相关输入框替换为 `<van-field>`
- [x] 6.7 在 `pages/rules/edit/edit.json` 中注册 `van-field` 组件
- [x] 6.8 在 `pages/rules/edit/edit.wxml` 中将初始筹码和额外加成输入框替换为 `<van-field>`

## 7. Sprint 2 — Cell 信息展示替换

- [x] 7.1 在 `pages/score/input/input.wxml` 中将初始筹码和额外加成的信息展示行替换为 `<van-cell>`
- [x] 7.2 在 `pages/member/detail/detail.json` 中注册 `van-cell` 和 `van-cell-group` 组件
- [x] 7.3 在 `pages/member/detail/detail.wxml` 中将成员信息展示行替换为 `<van-cell>`

## 8. Sprint 2 — 空状态替换

- [x] 8.1 在 `pages/group/list/list.json` 中注册 `van-empty` 组件
- [x] 8.2 在 `pages/group/list/list.wxml` 中将手写空状态（emoji + 文字）替换为 `<van-empty description="还没有加入任何记分组">`
- [x] 8.3 在 `pages/group/detail/detail.json` 中注册 `van-empty` 组件
- [x] 8.4 在 `pages/group/detail/detail.wxml` 中将赛程列表和积分榜的空状态替换为 `<van-empty>`

## 9. Sprint 2 — 验证

- [x] 9.1 在微信开发者工具中预览所有改造页面，验证输入框、Cell、空状态显示正常
- [x] 9.2 执行 E2E 测试回归

## 10. Sprint 3 — 骨架屏

- [x] 10.1 在 `pages/group/list/list.json` 中注册 `van-skeleton` 组件
- [x] 10.2 在 `pages/group/list/list.wxml` 中将"加载中..."文字替换为 `<van-skeleton title row="3" loading="{{loading}}">`
- [x] 10.3 在 `pages/match/detail/detail.json` 中注册 `van-skeleton` 组件（如需要）

## 11. Sprint 3 — Toast 统一反馈

- [x] 11.1 在需要 Toast 的页面 json 中注册 `van-toast` 组件，在 wxml 中添加 `<van-toast id="van-toast" />`
- [x] 11.2 在 `pages/group/list/list.js` 中引入 `import Toast from '@vant/weapp/toast/toast'`，将 `wx.showToast` 替换为 `Toast.success` / `Toast.fail`
- [x] 11.3 在 `pages/match/detail/detail.js` 中替换 Toast 调用
- [x] 11.4 在 `pages/score/input/input.js` 中替换 Toast 调用
- [x] 11.5 在 `pages/group/detail/detail.js` 中替换 Toast 调用
- [x] 11.6 在其余页面（group/create、match/create、rules/edit）中替换 Toast 调用

## 12. Sprint 3 — Tabs 替换

- [x] 12.1 在 `pages/group/detail/detail.json` 中注册 `van-tabs` 和 `van-tab` 组件
- [x] 12.2 在 `pages/group/detail/detail.wxml` 中将手写的 `.tab-bar` + `.tab-item` 替换为 `<van-tabs active="{{activeTab}}" bind:change="onTabChange">`
- [x] 12.3 在 `pages/group/detail/detail.js` 中适配 van-tabs 的 `change` 事件（从 `data-tab` 方式改为 `event.detail.index` 方式）
- [x] 12.4 清理 `pages/group/detail/detail.wxss` 中的 `.tab-bar`、`.tab-item`、`.tab-active` 样式

## 13. Sprint 3 — 清理与收尾

- [x] 13.1 清理 `app.wxss` 中不再使用的全局样式类（`.btn-primary`、`.btn-secondary`、`.btn-danger`、`.input-field` 等），确认所有页面已迁移后再删除
- [x] 13.2 废弃 `components/loading` 自定义组件，确认无页面引用后删除
- [x] 13.3 执行完整 E2E 测试回归，验证所有页面功能正常
- [x] 13.4 在微信开发者工具中检查包体积，确认总大小在合理范围内（预期 < 300KB）

## ADDED Requirements

### Requirement: 加入记分组弹窗使用 van-dialog
系统 SHALL 使用 van-dialog 组件替换 `pages/group/list/list.wxml` 中的手写加入记分组弹窗，提供动画过渡效果。

#### Scenario: 打开加入弹窗
- **WHEN** 用户点击"加入"按钮
- **THEN** van-dialog 以动画方式弹出，显示标题"加入记分组"
- **THEN** 弹窗内包含一个 6 位邀请码输入框（大写、居中、字间距 8rpx）
- **THEN** 弹窗底部显示"取消"和"确认加入"两个按钮

#### Scenario: 输入邀请码并确认加入
- **WHEN** 用户输入 6 位邀请码并点击"确认加入"
- **THEN** 按钮显示 loading 状态
- **THEN** 调用 joinGroup 云函数
- **THEN** 成功后弹窗关闭并跳转到组详情页

#### Scenario: 取消加入
- **WHEN** 用户点击"取消"按钮
- **THEN** 弹窗以动画方式关闭
- **THEN** 输入框内容清空

#### Scenario: 邀请码校验失败
- **WHEN** 用户未输入满 6 位邀请码就点击"确认加入"
- **THEN** 显示提示"请输入6位邀请码"
- **THEN** 弹窗保持打开状态

### Requirement: 结束赛程弹窗使用 van-dialog
系统 SHALL 使用 van-dialog 组件替换 `pages/match/detail/detail.wxml` 中的手写结束赛程确认弹窗。

#### Scenario: 打开结束赛程弹窗
- **WHEN** 管理员点击"结束赛程"按钮
- **THEN** van-dialog 以动画方式弹出，显示标题"确认结束赛程？"
- **THEN** 如果有未填写结算筹码的成员，弹窗内显示警告区域列出这些成员姓名
- **THEN** 弹窗底部显示"取消"和"确认结束"两个按钮

#### Scenario: 确认结束赛程
- **WHEN** 管理员点击"确认结束"
- **THEN** 按钮显示 loading 状态
- **THEN** 调用 finishMatch 云函数
- **THEN** 成功后弹窗关闭，页面刷新数据

#### Scenario: 取消结束赛程
- **WHEN** 管理员点击"取消"
- **THEN** 弹窗以动画方式关闭

### Requirement: 删除手写弹窗样式
系统 SHALL 删除 `list.wxss` 和 `detail.wxss` 中的 `.modal-mask`、`.modal-card`、`.modal-title` 等手写弹窗样式。

#### Scenario: 弹窗样式清理
- **WHEN** van-dialog 替换完成
- **THEN** `pages/group/list/list.wxss` 中不再包含 `.modal-mask`、`.modal-card`、`.modal-title` 样式定义
- **THEN** `pages/match/detail/detail.wxss` 中不再包含 `.modal-mask`、`.modal-card`、`.modal-title` 样式定义

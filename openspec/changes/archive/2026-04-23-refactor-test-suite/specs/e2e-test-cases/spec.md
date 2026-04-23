## ADDED Requirements

### Requirement: 记分组创建流程测试
E2E 测试 SHALL 验证记分组创建的完整流程，包括页面导航、表单输入、数据绑定和提交跳转。

#### Scenario: 进入创建页面
- **WHEN** 使用 `reLaunch` 导航到 `/pages/group/create/create`
- **THEN** 当前页面路径包含 `group/create`
- **THEN** 页面正常渲染，存在 `.input-field` 和 `.btn-primary` 元素

#### Scenario: 组名为空时按钮禁用
- **WHEN** 进入创建页面且未输入组名
- **THEN** 页面 data 中 `groupName` 为空字符串
- **THEN** 提交按钮处于禁用状态（`disabled` 属性为 true）

#### Scenario: 输入组名后数据绑定
- **WHEN** 在输入框中输入 "E2E测试组"
- **THEN** 页面 data 中 `groupName` 值为 "E2E测试组"

#### Scenario: 提交创建（需已登录）
- **WHEN** 输入组名并点击创建按钮
- **THEN** 等待云函数响应后，页面跳转到 `group/detail`（成功）或停留在当前页（失败）

### Requirement: 记分组列表页测试
E2E 测试 SHALL 验证记分组列表页的基本加载和数据结构。

#### Scenario: 访问列表页
- **WHEN** 使用 `reLaunch` 导航到 `/pages/group/list/list`
- **THEN** 当前页面路径包含 `group/list`
- **THEN** 页面 data 为有效对象

#### Scenario: 列表页数据结构
- **WHEN** 列表页加载完成
- **THEN** 页面 data 中包含 `groups` 数组和 `loading` 布尔值

### Requirement: 赛程创建流程测试
E2E 测试 SHALL 验证赛程创建流程（依赖环境变量 `TEST_GROUP_ID`）。

#### Scenario: 无 TEST_GROUP_ID 时跳过
- **WHEN** 未设置 `TEST_GROUP_ID` 环境变量
- **THEN** 赛程相关测试用例输出警告并跳过，不报错

#### Scenario: 进入创建赛程页面
- **WHEN** 设置了 `TEST_GROUP_ID` 并导航到创建赛程页面
- **THEN** 当前页面路径包含 `match/create`
- **THEN** 页面正常渲染

#### Scenario: 提交创建赛程
- **WHEN** 在创建赛程页面点击创建按钮
- **THEN** 等待云函数响应后，页面跳转到 `match/detail`

### Requirement: 分数填写页面测试
E2E 测试 SHALL 验证分数填写页面的基本加载（依赖环境变量 `TEST_SCORE_ID` 和 `TEST_MATCH_ID`）。

#### Scenario: 无环境变量时跳过
- **WHEN** 未设置 `TEST_SCORE_ID` 或 `TEST_MATCH_ID`
- **THEN** 分数填写测试用例输出警告并跳过

#### Scenario: 填写页面正常加载
- **WHEN** 设置了环境变量并导航到分数填写页面
- **THEN** 当前页面路径包含 `score/input`

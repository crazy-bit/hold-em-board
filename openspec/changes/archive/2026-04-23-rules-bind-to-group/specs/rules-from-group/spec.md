## ADDED Requirements

### Requirement: 规则统一从记分组读取
系统 SHALL 在所有需要规则配置（`chipRules`、`bonusCountsToTotal`）的场景中，从 `groups` 集合读取当前值，而非从 `matches.rulesSnapshot` 读取。

#### Scenario: 创建赛程时从 group 读取规则
- **WHEN** 管理员创建新赛程
- **THEN** `createMatch` 云函数 SHALL 从 `groups` 文档读取 `chipRules` 和 `bonusCountsToTotal`，并根据成员排名分配 `initialChips` 和 `bonus` 到 `scores` 记录
- **THEN** `matches` 文档中 SHALL NOT 包含 `rulesSnapshot` 字段

#### Scenario: 结束赛程时从 group 读取规则
- **WHEN** 管理员结束赛程
- **THEN** `finishMatch` 云函数 SHALL 通过 `match.groupId` 从 `groups` 文档读取最新的 `bonusCountsToTotal`
- **THEN** 积分计算使用 group 中的 `bonusCountsToTotal` 值

#### Scenario: 分数录入时从 group 读取规则
- **WHEN** 组员进入分数录入页填写结算筹码
- **THEN** 页面 SHALL 从 `groups` 文档读取 `bonusCountsToTotal` 用于积分预览计算

#### Scenario: 修改规则后立即生效
- **WHEN** 管理员修改了 `bonusCountsToTotal` 设置
- **THEN** 所有后续的赛程结束和分数录入 SHALL 使用修改后的新值
- **THEN** 已有赛程在结束时 SHALL 使用最新规则

### Requirement: 分数录入页接收 groupId 参数
分数录入页 SHALL 接收 `groupId` 参数，以便查询 group 的规则配置。

#### Scenario: 通过页面参数传递 groupId
- **WHEN** 用户从赛程详情页跳转到分数录入页
- **THEN** 跳转 URL SHALL 包含 `groupId` 参数
- **THEN** 分数录入页 SHALL 使用 `groupId` 查询 `groups` 集合获取规则

### Requirement: 规则编辑页提示文案更新
规则编辑页底部的提示 SHALL 移除"仅影响后续创建的赛程"的说明，改为准确反映当前行为。

#### Scenario: 规则编辑页显示正确提示
- **WHEN** 管理员进入规则编辑页
- **THEN** 页面底部 SHALL 显示"规则变更将对所有赛程生效"的提示

### Requirement: 兼容已有数据
系统 SHALL 兼容已有 `matches` 文档中的 `rulesSnapshot` 字段。

#### Scenario: 已有赛程包含 rulesSnapshot
- **WHEN** 系统处理包含 `rulesSnapshot` 的历史赛程
- **THEN** 系统 SHALL 忽略 `rulesSnapshot`，从 group 读取规则
- **THEN** 已有数据不需要迁移或清理

## Why

结束对局时缺少结算数据合法性检查：理论上每个玩家的结算筹码之和减去额外积分总和必须等于 0（筹码守恒），若数据有误会导致积分记录失真。当前流程允许在数据不平衡的情况下强制结束，需要在确认结束前给管理员明确的差额提示。

## What Changes

- 在点击"结束对局"时，前端校验所有玩家的 `finalChips` 之和减去所有 `bonus` 之和是否等于 0
- 若差额不为 0，弹出错误提示弹窗，显示当前差额值，阻止结束流程继续
- 若差额为 0（或所有人均未填写），继续原有的未填写人数确认弹窗流程

## Capabilities

### New Capabilities

- `end-match-score-validation`: 结束对局前的分数校验能力——计算 `sum(finalChips) - sum(bonus)`，若不为 0 则展示差额并阻断流程

### Modified Capabilities

<!-- 无现有 spec 的行为变更 -->

## Impact

- `subpages/match/detail/detail.js`：在 `finishMatch()` 方法中新增校验逻辑
- `subpages/match/detail/detail.wxml`：新增差额错误提示弹窗
- 不涉及云函数、数据库结构或其他页面变更

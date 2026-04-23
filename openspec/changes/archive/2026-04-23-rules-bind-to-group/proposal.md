## Why

当前赛程创建时会拍摄规则快照（`rulesSnapshot`）到 `matches` 文档中，导致规则变更不影响已有赛程。但实际使用中，管理员期望修改规则后所有赛程（包括进行中的）都使用最新规则，避免规则版本混乱。需要将规则的唯一来源固定在记分组（`groups`）上，移除赛程级别的规则快照。

## What Changes

- **BREAKING**: 移除 `matches` 集合中的 `rulesSnapshot` 字段，赛程不再独立存储规则快照
- 所有需要规则的场景（创建赛程分配筹码、结束赛程计算积分、分数录入预览）统一从 `groups` 集合读取当前规则
- `createMatch` 云函数不再生成 `rulesSnapshot`，改为读取组规则并直接使用
- `finishMatch` 云函数从 `groups` 读取规则而非 `match.rulesSnapshot`
- 分数录入页从 `groups` 读取 `bonusCountsToTotal` 而非 `match.rulesSnapshot`
- 规则编辑页提示文案更新：移除"仅影响后续赛程"的说明

## Capabilities

### New Capabilities

- `rules-from-group`: 统一从记分组读取规则，所有赛程共享组级规则配置

### Modified Capabilities

（无现有 specs 需要修改）

## Impact

- **云函数**: `createMatch`、`finishMatch` 需要修改规则读取逻辑
- **前端页面**: `pages/score/input/input.js` 需要改为从 group 读取规则；`pages/rules/edit/edit.wxml` 更新提示文案
- **数据兼容**: 已有 `matches` 文档中的 `rulesSnapshot` 字段变为废弃，需要兼容处理（读取时忽略即可）
- **测试**: 单元测试和 E2E 测试中涉及 `rulesSnapshot` 的部分需要更新

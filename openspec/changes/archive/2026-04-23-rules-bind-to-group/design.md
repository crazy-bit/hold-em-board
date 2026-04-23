## Context

当前系统中，规则（`chipRules` 和 `bonusCountsToTotal`）存储在 `groups` 集合中，但创建赛程时会将规则快照（`rulesSnapshot`）复制到 `matches` 文档。后续的积分计算和分数录入均从 `match.rulesSnapshot` 读取。

这种快照机制的初衷是"规则变更不影响历史赛程"，但实际使用中管理员期望规则修改后对所有赛程统一生效，快照反而造成了困惑。

涉及的代码模块：
- 云函数：`createMatch`、`finishMatch`
- 前端页面：`pages/score/input/input.js`、`pages/rules/edit/edit.wxml`
- 工具函数：`utils/util.js`（`calcPoints`、`getRuleByRank` 不变）
- 测试：`tests/unit/cloudfunctions.test.js`、`tests/e2e/rules.test.js`

## Goals / Non-Goals

**Goals:**
- 规则统一从 `groups` 集合读取，所有赛程共享组级规则
- `createMatch` 不再写入 `rulesSnapshot`
- `finishMatch` 和分数录入页从 group 读取规则
- 兼容已有数据（已有 `rulesSnapshot` 字段保留但不再使用）

**Non-Goals:**
- 不清理历史 `matches` 文档中的 `rulesSnapshot` 字段（无害数据，保留不影响）
- 不修改 `calcPoints`、`getRuleByRank` 等纯计算函数（逻辑不变）
- 不新增数据库集合或字段

## Decisions

### 1. 规则读取统一从 group 文档获取

**选择**: 所有需要规则的地方都通过 `groupId` 查询 `groups` 集合获取 `chipRules` 和 `bonusCountsToTotal`。

**理由**: 
- 单一数据源，避免规则版本不一致
- 管理员修改规则后立即对所有赛程生效
- 减少 `matches` 文档大小

**备选方案**: 保留快照但增加"同步规则"按钮 — 增加了复杂度，不符合用户简化预期。

### 2. createMatch 不再写入 rulesSnapshot

**选择**: `createMatch` 云函数移除 `rulesSnapshot` 的构建和写入。创建赛程时仍然读取组规则为成员分配初始筹码和加成（这部分逻辑保留在 `scores` 记录中）。

**理由**: 每个成员的 `scores` 记录中已有 `initialChips` 和 `bonus`，这些是"分配时"的值，属于赛程事实数据，不属于规则快照。规则配置（如 `bonusCountsToTotal`）才需要从 group 实时读取。

### 3. finishMatch 从 group 读取 bonusCountsToTotal

**选择**: `finishMatch` 通过 `match.groupId` 查询 `groups` 集合，获取最新的 `bonusCountsToTotal` 值。

**理由**: 这是本次变更的核心——管理员修改"额外加成是否计入"后，结束赛程时立即使用最新设置。

### 4. 分数录入页从 group 读取规则

**选择**: `pages/score/input/input.js` 增加读取 group 的逻辑，从 group 获取 `bonusCountsToTotal`。需要将 `groupId` 通过页面参数传递。

**理由**: 预览积分计算需要知道 `bonusCountsToTotal`，不再从 `match.rulesSnapshot` 获取。

## Risks / Trade-offs

- **[行为变更]** 修改规则后历史赛程的积分计算可能变化 → 这正是用户期望的行为，管理员应知悉
- **[额外查询]** `finishMatch` 和分数录入页需要多一次 group 查询 → 查询量极小（单文档读取），性能影响可忽略
- **[数据兼容]** 已有 `matches.rulesSnapshot` 成为死数据 → 不影响功能，后续可选择性清理

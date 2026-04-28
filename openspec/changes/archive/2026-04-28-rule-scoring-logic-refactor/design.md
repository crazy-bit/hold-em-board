## Context

当前积分规则中，`chipRules` 数组同时承载了"初始筹码"和"额外加成"两个维度的按名次配置。`createMatch` 在创建赛程时，通过 `calcCurrentLeaderboard` 计算当前总积分排名，再按 `index+1` 作为 rank 调用 `getRuleByRank` 为每个成员分配 `initialChips` 和 `bonus`。

存在两个问题：
1. **初始筹码按名次差异化**：领先者获得更多初始筹码，形成"强者愈强"的马太效应，不符合公平竞技设计
2. **初始状态名次错误**：当 `finishedMatches.length === 0` 时，`calcCurrentLeaderboard` 返回所有成员 `totalPoints=0` 但仍按 `index+1` 排序，导致第一个加入的成员被分配 rank=1 的规则，而非默认规则

涉及的代码模块：
- 云函数：`cloudfunctions/createMatch/index.js`、`cloudfunctions/saveRules/index.js`
- 前端页面：`subpages/rules/edit/edit.wxml`、`subpages/rules/edit/edit.js`
- 工具函数：`subpages/utils/util.js`（`calcPoints`、`getRuleByRank`）
- 测试：`tests/unit/cloudfunctions.test.js`、`tests/unit/utils.test.js`

## Goals / Non-Goals

**Goals:**
- 所有成员使用统一的初始筹码（不按名次区分）
- 额外加成仍按名次差异化配置
- 初始状态（无历史赛程）下所有成员视为无名次，使用默认规则（rank=0）
- 额外加成是否计入总分的开关保持不变
- 规则编辑页 UI 调整为统一初始筹码 + 按名次额外加成

**Non-Goals:**
- 不修改 `calcPoints` 的计算公式（逻辑不变）
- 不修改数据库集合结构（`chipRules` 数组格式保持兼容）
- 不迁移历史数据（已有 `scores` 记录中的 `initialChips` 保留不变）
- 不修改 `bonusCountsToTotal` 的语义

## Decisions

### 1. chipRules 数据结构保持兼容，语义调整

**选择**：`chipRules` 数组格式不变（`[{ rank, initialChips, bonus }]`），但约定 `initialChips` 只从 `rank=0`（默认规则）读取，所有名次共用同一个 `initialChips` 值。

**理由**：
- 无需数据库迁移，已有数据自然兼容
- `getRuleByRank` 在查找 `initialChips` 时始终使用 `rank=0` 的值，查找 `bonus` 时仍按名次匹配

**备选方案**：新增 `globalInitialChips` 字段 — 需要数据迁移，增加字段复杂度，不采用。

### 2. 初始状态下所有成员 rank=0（无名次）

**选择**：在 `calcCurrentLeaderboard` 中，当 `finishedMatches.length === 0` 时，返回的成员列表中不携带 rank 信息；在 `createMatch` 的 `scorePromises` 循环中，当无历史赛程时所有成员使用 `rank=0` 调用 `getRuleByRank`。

**理由**：
- 初始状态下没有任何积分数据，不应产生名次差异
- 使用 `rank=0` 即默认规则，语义清晰

**备选方案**：`calcCurrentLeaderboard` 返回特殊标记 `hasHistory: false` — 增加了接口复杂度，不采用。

### 3. createMatch 中分离 initialChips 和 bonus 的获取逻辑

**选择**：
- `initialChips` 始终从 `getRuleByRank(chipRules, 0)` 获取（默认规则）
- `bonus` 从 `getRuleByRank(chipRules, rank)` 获取（按名次，无历史时 rank=0）

**理由**：最小化改动，`getRuleByRank` 函数本身不需要修改，只调整调用方式。

### 4. 规则编辑页 UI 调整

**选择**：规则编辑页将"初始筹码"从每个名次行中提取为页面顶部的全局输入框，每个名次行只保留"额外加成"输入。保存时，`chipRules` 中所有 rank 的 `initialChips` 均写入相同值（或只在 rank=0 中存储）。

**理由**：UI 直观反映"初始筹码统一"的语义，避免用户误解。

## Risks / Trade-offs

- **[历史数据兼容]** 已有 `chipRules` 中各名次的 `initialChips` 值不同 → 代码读取时统一取 `rank=0` 的值，历史数据中其他名次的 `initialChips` 成为死数据，不影响功能
- **[UI 变更]** 规则编辑页布局调整，管理员需要重新理解配置方式 → 变更符合直觉，影响可接受
- **[测试覆盖]** 初始状态名次修复需要新增测试用例 → 在单元测试中补充 `finishedMatches=0` 场景

## Migration Plan

1. 更新 `createMatch` 云函数逻辑（无需部署数据库变更）
2. 更新 `saveRules` 云函数（兼容新的保存格式）
3. 更新前端规则编辑页
4. 更新单元测试
5. 无需数据迁移，无回滚风险

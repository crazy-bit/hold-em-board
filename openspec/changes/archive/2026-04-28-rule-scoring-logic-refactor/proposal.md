## Why

当前积分规则中，初始筹码按总积分名次分配（第1名获得最高初始筹码），导致领先者优势叠加，不符合公平竞技的设计意图。同时，初始状态下（所有人都未参与比赛时）系统仍会按 index+1 分配名次，导致第一个加入的成员意外获得"第1名"的初始筹码，而非统一的默认值。需要将规则调整为：所有人初始积分一致，额外加成按名次差异化配置，并修复初始状态下的名次判断逻辑。

## What Changes

- **所有人初始积分一致**：`chipRules` 中的 `initialChips` 字段统一为单一值，不再按名次区分；规则配置页移除"按名次配置初始筹码"的功能，改为全局统一初始筹码输入
- **额外加成按名次配置**：保留 `chipRules` 中按名次配置 `bonus` 的能力，不同名次可设置不同额外加成
- **额外加成可配置是否计入总分**：保留 `bonusCountsToTotal` 开关，控制额外加成是否纳入本期积分计算
- **额外加成计算当前赛程的结算分数**：额外加成仅影响当前赛程的积分结算（`points = finalChips - initialChips + bonus`），不单独累计
- **初始状态视为无名次**：当所有成员都未参与过任何赛程时（`finishedMatches.length === 0`），所有人均视为无名次，使用默认规则（`rank=0`）分配，而非按 index+1 分配名次

## Capabilities

### New Capabilities
- `unified-initial-chips`: 统一初始筹码配置——所有成员使用相同的初始筹码，不再按名次区分

### Modified Capabilities
- `scoring-rules`: 规则配置行为变更——初始筹码统一配置，额外加成仍按名次配置；初始状态（无历史赛程）下所有人视为无名次

## Impact

- **云函数** `cloudfunctions/createMatch/index.js`：`calcCurrentLeaderboard` 返回无名次时所有成员 rank 使用 0（默认规则），`getRuleByRank` 调用时传入 rank=0；`initialChips` 从统一配置读取
- **云函数** `cloudfunctions/saveRules/index.js`：保存规则时兼容新的数据结构（统一 `initialChips` + 按名次 `bonus`）
- **前端** `subpages/rules/edit/edit.wxml` / `edit.js`：规则编辑页改为统一初始筹码输入 + 按名次额外加成配置
- **工具函数** `subpages/utils/util.js`：`getRuleByRank` 逻辑可能需要调整以支持只按名次查 bonus
- **测试** `tests/unit/cloudfunctions.test.js` / `tests/unit/utils.test.js`：更新相关测试用例

## 1. 云函数：createMatch 修复初始状态名次逻辑

- [x] 1.1 修改 `cloudfunctions/createMatch/index.js`：在 `calcCurrentLeaderboard` 中，当 `finishedMatches.length === 0` 时，返回的成员列表标记为无历史（可通过返回值携带 `hasHistory: false` 或在调用处判断）
- [x] 1.2 修改 `createMatch` 的 `scorePromises` 循环：当无历史赛程时，所有成员使用 `rank=0` 调用 `getRuleByRank`；有历史赛程时仍按 `index+1` 获取 bonus 对应的名次规则
- [x] 1.3 修改 `createMatch` 的 `scorePromises` 循环：`initialChips` 始终从 `getRuleByRank(chipRules, 0).initialChips` 获取（统一初始筹码），`bonus` 仍按名次获取

## 2. 云函数：saveRules 兼容新格式

- [x] 2.1 修改 `cloudfunctions/saveRules/index.js`：接收前端传入的统一 `initialChips` 值，保存时将该值写入 `chipRules` 中 `rank=0` 的 `initialChips` 字段，其他名次的 `initialChips` 也统一设为相同值（保持数据结构兼容）

## 3. 前端：规则编辑页 UI 调整

- [x] 3.1 修改 `subpages/rules/edit/edit.wxml`：在页面顶部添加全局统一初始筹码输入框，从每个名次行中移除 `initialChips` 输入
- [x] 3.2 修改 `subpages/rules/edit/edit.js`：`onLoad` 时从 `chipRules[rank=0].initialChips` 读取统一初始筹码并绑定到页面数据；`onSave` 时将统一初始筹码写入所有名次规则的 `initialChips` 字段

## 4. 测试更新

- [x] 4.1 更新 `tests/unit/cloudfunctions.test.js`：新增测试用例——当 `finishedMatches=[]` 时，所有成员应使用 `rank=0` 的规则（初始筹码和额外加成均使用默认规则）
- [x] 4.2 更新 `tests/unit/cloudfunctions.test.js`：新增测试用例——有历史赛程时，`initialChips` 对所有成员相同，`bonus` 按名次差异化
- [x] 4.3 更新 `tests/unit/utils.test.js`：确认 `getRuleByRank` 在 `rank=0` 时正确返回默认规则（已有测试，验证覆盖即可）

## 1. 云函数：createMatch 移除 rulesSnapshot

- [x] 1.1 修改 `cloudfunctions/createMatch/index.js`：移除 `rulesSnapshot` 的构建和写入 `matches` 文档的逻辑，保留从 group 读取规则并为成员分配筹码的逻辑

## 2. 云函数：finishMatch 从 group 读取规则

- [x] 2.1 修改 `cloudfunctions/finishMatch/index.js`：通过 `match.groupId` 查询 `groups` 集合获取 `bonusCountsToTotal`，替换原来从 `match.rulesSnapshot` 读取的逻辑

## 3. 前端：分数录入页从 group 读取规则

- [x] 3.1 修改赛程详情页跳转分数录入的链接，增加 `groupId` 参数（`pages/match/detail/detail.wxml` 和 `detail.js`）
- [x] 3.2 修改 `pages/score/input/input.js`：`onLoad` 接收 `groupId` 参数，`loadScore` 中从 `groups` 集合读取 `bonusCountsToTotal`，替换原来从 `match.rulesSnapshot` 读取的逻辑

## 4. 前端：规则编辑页提示文案更新

- [x] 4.1 修改 `pages/rules/edit/edit.wxml`：将底部提示从"规则变更仅影响后续创建的赛程，不影响历史赛程"改为"规则变更将对所有赛程生效"

## 5. 测试更新

- [x] 5.1 更新 `tests/unit/cloudfunctions.test.js`：移除 `rulesSnapshot` 相关断言，增加从 group 读取规则的测试
- [x] 5.2 更新 `tests/e2e/rules.test.js`：验证规则变更对所有赛程生效的行为

## 6. 文档更新

- [x] 6.1 更新 `database/README.md`：移除 `matches.rulesSnapshot` 字段说明，标注规则统一存储在 `groups` 中

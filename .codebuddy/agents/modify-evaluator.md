---
name: modify-evaluator
description: 仓库发生修改后，评估代码修改范围，执行相应的测试用例验证，通过后提交到仓库
model: claude-4.5
tools: list_dir, search_file, search_content, read_file, read_lints, replace_in_file, write_to_file, execute_command, mcp_get_tool_description, mcp_call_tool, delete_file, preview_url, web_fetch, use_skill, web_search, automation_update
agentMode: agentic
enabled: true
enabledAutoRun: true
---

# 修改评估与验证提交流程

当仓库发生修改后，按以下流程执行：**评估修改范围 → 确定测试策略 → 执行测试 → 提交代码**。

---

## Step 1：评估修改范围

执行以下命令获取变更文件列表：

```bash
git diff --name-only HEAD
git diff --stat HEAD
```

如果 `git diff HEAD` 无输出（已暂存但未提交），则使用：

```bash
git diff --name-only --cached
git status --short
```

---

## Step 2：根据修改范围确定测试策略

根据变更文件路径，映射到需要执行的测试用例：

### 修改范围 → 测试映射表

| 修改文件路径                       | 需要执行的单元测试                  | 需要执行的 E2E 测试                                        |
| ---------------------------------- | ----------------------------------- | ---------------------------------------------------------- |
| `utils/util.js`                    | `tests/unit/utils.test.js`          | —                                                          |
| `cloudfunctions/createGroup/**`    | `tests/unit/cloudfunctions.test.js` | `tests/e2e/group.test.js`                                  |
| `cloudfunctions/joinGroup/**`      | `tests/unit/cloudfunctions.test.js` | `tests/e2e/group.test.js`                                  |
| `cloudfunctions/getGroupDetail/**` | `tests/unit/cloudfunctions.test.js` | `tests/e2e/group.test.js`, `tests/e2e/member.test.js`      |
| `cloudfunctions/createMatch/**`    | `tests/unit/cloudfunctions.test.js` | `tests/e2e/match.test.js`, `tests/e2e/multiPlayer.test.js` |
| `cloudfunctions/finishMatch/**`    | `tests/unit/cloudfunctions.test.js` | `tests/e2e/match.test.js`, `tests/e2e/multiPlayer.test.js` |
| `cloudfunctions/saveScore/**`      | `tests/unit/cloudfunctions.test.js` | `tests/e2e/match.test.js`                                  |
| `cloudfunctions/saveRules/**`      | `tests/unit/cloudfunctions.test.js` | `tests/e2e/rules.test.js`                                  |
| `cloudfunctions/cancelMatch/**`    | `tests/unit/cloudfunctions.test.js` | `tests/e2e/match.test.js`                                  |
| `cloudfunctions/login/**`          | —                                   | `tests/e2e/group.test.js`                                  |
| `pages/group/**`                   | —                                   | `tests/e2e/group.test.js`                                  |
| `pages/match/**`                   | —                                   | `tests/e2e/match.test.js`                                  |
| `pages/member/**`                  | —                                   | `tests/e2e/member.test.js`                                 |
| `pages/rules/**`                   | —                                   | `tests/e2e/rules.test.js`                                  |
| `pages/score/**`                   | —                                   | `tests/e2e/match.test.js`                                  |
| `pages/login/**`                   | —                                   | `tests/e2e/group.test.js`                                  |
| `tests/e2e/**`                     | —                                   | 对应修改的测试文件本身                                     |
| `tests/unit/**`                    | 对应修改的测试文件本身              | —                                                          |

### 判断规则

1. **仅修改测试文件**（`tests/` 目录下）：只执行被修改的测试文件
2. **修改了业务代码**（`pages/`、`cloudfunctions/`、`utils/`）：按映射表执行对应的单元测试 + E2E 测试
3. **修改了配置文件**（`app.js`、`app.json`、`project.config.json`）：执行全量测试
4. **仅修改文档/样式**（`.md`、`.wxss`、`.json` 配置）：可跳过测试，直接提交
5. **修改了测试基础设施**（`tests/e2e/setup.js`、`tests/e2e/helpers.js`、`jest.config*.js`）：执行全量测试

---

## Step 3：执行测试

调用 `verify` skill 执行测试。根据 Step 2 的分析结果，选择执行策略：

### 策略 A：全量测试
当修改范围较广或涉及基础设施时，执行完整验证流程：
- 先执行 `npm run test:unit`
- 再执行 `npm run test:e2e`（需先确保 automator 服务已启动）

### 策略 B：定向测试
当修改范围明确时，只执行相关测试：
- 单元测试：`npx jest <具体测试文件路径>`
- E2E 测试：`npx jest --config jest.config.e2e.js --runInBand <具体测试文件路径>`

### 策略 C：跳过测试
当仅修改文档、样式等不影响逻辑的文件时，跳过测试直接进入 Step 4。

### 测试结果判断

- **全部通过** → 进入 Step 4 提交
- **有失败** → 分析失败原因，输出失败用例和错误信息，**不执行提交**，报告给用户

---

## Step 4：提交到仓库

测试通过后，调用 `maintaince-app` skill 执行提交流程（commit + rebase + push）。

---

## 完整执行示例

```
1. git diff --name-only HEAD
   → 发现修改了 cloudfunctions/createMatch/index.js, pages/match/detail/detail.js

2. 映射测试范围：
   → 单元测试: tests/unit/cloudfunctions.test.js
   → E2E 测试: tests/e2e/match.test.js, tests/e2e/multiPlayer.test.js

3. 执行测试（调用 verify skill）：
   → npx jest tests/unit/cloudfunctions.test.js
   → npx jest --config jest.config.e2e.js --runInBand tests/e2e/match.test.js tests/e2e/multiPlayer.test.js

4. 测试全部通过 → 调用 maintaince-app skill 提交
```
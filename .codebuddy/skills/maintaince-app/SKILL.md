---
name: maintaince-app
description: >-
  用于维护和更新应用内容的 skill。
  支持 git 提交变更（含自动 rebase 冲突解决与 push）和拉取更新操作。
  当用户说"提交变更"、"提交"、"变更app"、"提交app"时触发提交流程；
  当用户说"更新"、"更新app"时触发拉取流程。
category: common_tools
---

# App 维护工具

## 概述

本技能用于维护和更新应用内容，提供两类核心操作：

1. **提交变更**：将本地修改提交并推送到远程仓库，自动处理 rebase 冲突
2. **拉取更新**：从远程仓库拉取最新内容

---

## 触发关键词

| 用户输入 | 触发操作 |
|---------|---------|
| `提交变更` / `提交` / `变更app` / `提交app` | 执行提交流程（commit + rebase + push） |
| `更新` / `更新app` | 执行拉取流程（git pull） |

---

## 工作流程

### 提交变更流程

当用户触发提交操作时，按以下步骤执行：

#### Step 1：检查当前状态

```bash
git status
git diff --stat
```

- 查看哪些文件有变更
- 了解变更内容，用于生成 commit 消息

#### Step 2：生成 commit 消息

根据变更内容自动总结 commit 消息，规则如下：

- 分析 `git diff` 或 `git status` 的输出，理解变更的文件和内容
- 用简洁的中文描述本次变更的核心内容
- **标题格式**：`<type>(<scope>): <简要描述>`（中文为主，英文仅用于专有名词）
  - `type` 参考：`feat`（新增）、`fix`（修复）、`update`（更新）、`refactor`（重构）、`docs`（文档）、`chore`（杂项）
  - `scope` 为可选的变更范围，如 `skill`、`review`、`config` 等
  - 示例：`update(skill): 更新 content-review-workflow 台词审核流程`

- **commit 消息正文**（多行格式，适用于有实质内容的提交）：

  ```
  <type>(<scope>): <简要描述>

  > 🤖 本提交由 AI Agent 自动发起
  >
  > ⚠️ 请仔细审查变更内容，AI 生成的修改可能存在问题

  ## 变更描述
  [简要描述本次变更的目的和内容]

  ## 变更内容
  - [ ] [具体变更项 1]
  - [ ] [具体变更项 2]

  🤖 Generated with maintaince-app(SKILL)
  ```

  > **注意**：对于小型日常提交（如单文件修改、审核记录更新），可仅使用标题行，不必附完整正文。
  > 正文模板详见 `references/template.md`。

#### Step 3：暂存并提交

```bash
git add -A
git commit -m "<自动生成的commit消息>"
```

#### Step 4：Rebase 并自动解决冲突

```bash
git fetch origin
git rebase origin/<当前分支名>
```

若 rebase 过程中出现冲突，自动解决策略：

- **优先保留本地变更**（`ours` 策略）
- 对冲突文件执行：
  ```bash
  git checkout --ours <冲突文件>
  git add <冲突文件>
  git rebase --continue
  ```
- 若仍有冲突，继续重复上述步骤直至 rebase 完成

#### Step 5：推送到远程

```bash
git push origin <当前分支名>
```

若 push 被拒绝（非快进），使用 force-with-lease 安全强推：

```bash
git push --force-with-lease origin <当前分支名>
```

---

### 拉取更新流程

当用户触发更新操作时，按以下步骤执行：

#### Step 1：检查本地状态

```bash
git status
```

- 若有未提交的本地变更，先暂存：
  ```bash
  git stash
  ```

#### Step 2：拉取远程更新

```bash
git pull --rebase origin <当前分支名>
```

使用 `--rebase` 模式拉取，保持提交历史整洁。

#### Step 3：恢复暂存内容（如有）

若第一步执行了 `git stash`，则恢复：

```bash
git stash pop
```

若 stash pop 出现冲突，优先保留本地变更：

```bash
git checkout --ours <冲突文件>
git add <冲突文件>
```

---

## 执行规范

### 获取当前分支名

在执行任何操作前，先获取当前分支：

```bash
git branch --show-current
```

### 错误处理

| 错误情况 | 处理方式 |
|---------|---------|
| rebase 冲突 | 自动选择本地版本（`--ours`），继续 rebase |
| push 被拒绝 | 使用 `--force-with-lease` 强推 |
| rebase 中断 | 检查状态后执行 `git rebase --abort` 并重试 |
| 网络错误 | 提示用户检查网络连接后重试 |

### 操作完成后反馈

每次操作完成后，向用户报告：

- ✅ 操作成功时：说明执行了哪些步骤、commit 消息内容、推送/拉取的分支
- ❌ 操作失败时：说明失败原因和建议的解决方案

---

## 示例对话

### 提交变更示例

**用户**：提交变更

**助手执行流程**：
1. 运行 `git status` 和 `git diff --stat` 查看变更
2. 根据变更内容生成 commit 消息，例如：`update(review): 新增角色台词审核记录，完成第3批次审核`
3. 执行 `git add -A && git commit -m "update(review): 新增角色台词审核记录，完成第3批次审核"`
4. 执行 `git fetch origin && git rebase origin/main`
5. 执行 `git push origin main`
6. 报告：✅ 已成功提交并推送，commit: `update(review): 新增角色台词审核记录，完成第3批次审核`

---

### 拉取更新示例

**用户**：更新app

**助手执行流程**：
1. 运行 `git status` 检查本地状态
2. 若有变更，执行 `git stash`
3. 执行 `git pull --rebase origin main`
4. 若有 stash，执行 `git stash pop`
5. 报告：✅ 已成功拉取最新内容，当前分支 `main` 已是最新版本

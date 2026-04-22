## 项目概述

### 遇到报错的处理规范

**E2E 测试或小程序运行报错时，必须先读取开发者工具日志再排查：**

```bash
node -e "
const fs=require('fs');
const logDir='C:/Users/hugoqin/AppData/Local/微信开发者工具/User Data/270d7310f77e162f7f0cb30ab692180c/WeappLog/logs';
const files=fs.readdirSync(logDir).sort();
const latest=files[files.length-1];
console.log('最新日志:', latest);
const lines=fs.readFileSync(logDir+'/'+latest,'utf8').split('\n');
lines.filter(l=>l.includes('[ERROR]')).forEach(l=>console.log(l));
"
```

> 详细日志分析方法见 `.codebuddy/skills/verify/SKILL.md` 第 5 节。

---

### 验证流程

### 提交规范

**代码修改后，调用 `modify-evaluator` subagent 进行评估和验证：**

`modify-evaluator` 会自动完成以下流程：
1. **评估修改范围** — 通过 `git diff` 分析变更文件
2. **确定测试策略** — 根据修改范围→测试映射表，定向选择需要执行的单元测试和 E2E 测试
3. **执行测试验证** — 调用 `verify` skill 执行对应测试（支持全量/定向/跳过三种策略）
4. **提交到仓库** — 测试通过后调用 `maintaince-app` skill 完成 commit + rebase + push

**完整的任务完成流程：**

```
完成代码修改
    ↓
→ modify-evaluator subagent
    ├── Step 1: git diff 评估修改范围
    ├── Step 2: 映射到对应的单元测试 + E2E 测试
    ├── Step 3: 调用 verify skill 执行定向测试
    └── Step 4: 测试通过 → 调用 maintaince-app skill（commit + rebase + push）
```

> **AI 辅助开发注意**：代码修改完成后，AI 应主动触发 `modify-evaluator` subagent，由其自动完成评估→测试→提交的完整流程。测试失败时不会提交，而是报告失败原因。

---

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

**代码修改后，调用 `modify-evaluator` subagent 进行评估，由其决定是否提交：**

`modify-evaluator` 会评估本次修改是否构成完整功能，若评估通过则自动调用 `maintaince-app` skill 完成提交。

**完整的任务完成流程：**

```
完成代码修改
    ↓
「验证」→ verify skill（编译 + build:experts + 单元测试 + E2E）
    ↓
→ modify-evaluator subagent（评估修改完整性，决定是否提交）
    ↓（若评估通过）
→ maintaince-app skill（commit + rebase + push）
```

> **AI 辅助开发注意**：验证通过后，AI 应主动触发 `modify-evaluator` subagent 进行评估，由 subagent 判断是否达到提交标准。

---

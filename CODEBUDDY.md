## 项目概述

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

---
name: verify
description: 执行小程序的单元测试和 E2E 自动化测试，验证代码正确性。单元测试覆盖工具函数和云函数核心逻辑；E2E 测试通过 miniprogram-automator 驱动微信开发者工具进行真实页面交互验证。当用户说「跑测试」「验证」「verify」「测试一下」「run tests」「check」时使用。
---

# Verify — 小程序测试执行

## 快速判断

| 用户意图 | 执行命令 |
|---------|---------|
| 跑所有测试 | 先单元测试，再 E2E |
| 只跑单元测试 | `npm run test:unit` |
| 只跑 E2E | 见 [E2E 前置条件](#e2e-前置条件) |
| 看覆盖率 | `npm run test:coverage` |

---

## 1. 单元测试

直接运行，无需任何前置条件：

```bash
npm run test:unit
```

覆盖范围：`utils/util.js` 工具函数 + 云函数核心逻辑（积分计算、规则匹配、输入校验）。

**解读结果：**
- `Tests: N passed` — 全绿即通过
- 失败时查看 `●` 标记的用例，错误信息直接指向出错行

---

## 2. E2E 测试

### E2E 前置条件

运行前确认以下两项：

**① 自动化进程已启动**（每次重启电脑后需重新执行）

```bash
npm run auto:start
```

> 等价于：`"D:/微信web开发者工具/cli.bat" auto --project . --auto-port 9420`
> 
> 成功标志：命令持续运行，不报错退出

**② 开发者工具已开启服务端口**

开发者工具 → 设置 → 安全 → 开启服务端口 ✓

### 运行 E2E

```bash
npm run test:e2e
```

带测试数据（测试赛程相关功能）：

```bash
TEST_GROUP_ID=<组ID> TEST_SCORE_ID=<分数ID> TEST_MATCH_ID=<赛程ID> npm run test:e2e
```

---

## 3. 完整验证流程

```
1. npm run test:unit          # 先跑单元测试（快，~1s）
2. npm run auto:start &       # 后台启动自动化进程
3. npm run test:e2e           # 再跑 E2E（慢，~35s）
```

---

## 4. 常见问题

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `Wechat web devTools not found` | cliPath 错误 | 检查 `__tests__/e2e/setup.js` 中 `CLI_PATH` |
| `Failed connecting to ws://127.0.0.1:9420` | 自动化进程未启动 | 运行 `npm run auto:start` |
| `can not navigateTo a tabbar page` | 用 `navigateTo` 访问 tabbar 页 | 改用 `switchTab` |
| `timeout waiting for automator response` | 页面加载超时或未登录 | 检查开发者工具是否已登录 |
| `split` 报错 | automator 版本兼容问题 | 运行 `node patch-automator.js` |

---

## 5. 测试文件位置

```
__tests__/
├── unit/
│   ├── utils.test.js          # utils/util.js 单元测试（25个用例）
│   └── cloudfunctions.test.js # 云函数逻辑测试（17个用例）
└── e2e/
    ├── setup.js               # automator 连接配置
    ├── group.test.js          # 记分组功能 E2E
    └── match.test.js          # 赛程+分数 E2E
```

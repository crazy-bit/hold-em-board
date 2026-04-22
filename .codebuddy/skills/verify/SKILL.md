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

运行前确认：**微信开发者工具已打开**并加载了本项目，且**已开启服务端口**（设置 → 安全 → 开启服务端口 ✓）。

### 自动检查并启动 auto 服务

**在运行 E2E 测试前，必须先执行以下检查流程**（按顺序执行）：

**Step 1：检查 9420 端口是否已开放**

```bash
node -e "const net=require('net');const s=new net.Socket();s.setTimeout(3000);s.on('connect',()=>{console.log('端口 9420 已开放');s.destroy()});s.on('timeout',()=>{console.log('端口 9420 超时');s.destroy()});s.on('error',(e)=>{console.log('端口 9420 不可达:',e.code)});s.connect(9420,'127.0.0.1')"
```

- 如果输出 `端口 9420 已开放` → 跳到 **Step 3** 直接运行 E2E
- 如果输出 `不可达` 或 `超时` → 继续 **Step 2**

**Step 2：通过 HTTP 端口启动 auto 服务**

微信开发者工具的 HTTP 服务端口为 35664，通过它调用 `/v2/auto` API 启动 automator WebSocket 服务：

```bash
node -e "const http=require('http');const options={hostname:'127.0.0.1',port:35664,path:'/v2/auto?project=i%3A%5Cai%5Chold-em-board&auto-port=9420',method:'GET',timeout:10000};const req=http.request(options,(res)=>{let d='';res.on('data',c=>d+=c);res.on('end',()=>console.log('Status:',res.statusCode,'Body:',d))});req.on('error',e=>console.log('Error:',e.message));req.on('timeout',()=>{console.log('Timeout');req.destroy()});req.end()"
```

- 如果输出 `Status: 200` → 等待 3 秒后重新检查 9420 端口（回到 Step 1）
- 如果输出 `Error: connect ECONNREFUSED` → 说明开发者工具未打开或未开启服务端口，提示用户手动处理

> **原理**：35664 是微信开发者工具的 HTTP CLI 服务端口，`/v2/auto` 接口等价于 `cli.bat auto` 命令，会在 9420 端口启动 automator 的 WebSocket 服务。

**Step 3：运行 E2E 测试**

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
1. npm run test:unit                          # 先跑单元测试（快，~1s）
2. 检查 9420 端口 → 不可达则通过 35664 启动    # 自动启动 auto 服务（见 Step 1-2）
3. npm run test:e2e                           # 再跑 E2E（慢，~35s）
```

---

## 4. 常见问题

| 错误信息 | 原因 | 解决方案 |
|---------|------|---------|
| `Wechat web devTools not found` | cliPath 错误 | 检查 `tests/e2e/setup.js` 中 `CLI_PATH` |
| `Failed connecting to ws://127.0.0.1:9420` | 自动化进程未启动 | 按 [自动检查并启动 auto 服务](#自动检查并启动-auto-服务) 的 Step 1-2 执行 |
| `can not navigateTo a tabbar page` | 用 `navigateTo` 访问 tabbar 页 | 改用 `reLaunch` 或 `switchTab` |
| `timeout waiting for automator response` | 页面加载超时或未登录 | 检查开发者工具是否已登录 |
| `split` 报错 | automator 版本兼容问题 | 运行 `node patch-automator.js` |

---

## 5. 读取开发者工具日志

遇到 E2E 报错时，优先读取开发者工具日志定位根因。

**日志目录：**
```
C:\Users\hugoqin\AppData\Local\微信开发者工具\User Data\270d7310f77e162f7f0cb30ab692180c\WeappLog\logs\
```

**读取最新日志中的 ERROR：**
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

**常见日志错误含义：**

| 日志关键字 | 含义 | 解决方案 |
|-----------|------|----------|
| `在项目根目录未找到 app.json` | 开发者工具未正确识别项目路径 | 确认 `auto:start` 使用绝对路径 `--project i:/ai/hold-em-board` |
| `appid missing, 错误码：41002` | project.config.json 中 appid 未配置 | 检查 `project.config.json` 的 `appid` 字段 |
| `INVOKE_SERVICE timeout after 300000ms` | 渲染进程无响应，automator 指令全部超时 | 重启开发者工具，重新运行 `auto:start` |
| `getAppConfig error` | 模拟器启动失败 | 检查项目路径和 app.json 是否存在 |

---

## 6. Console 日志收集

E2E 测试框架会自动捕获小程序的 console 输出（`console.log`、`console.error` 等），方便在测试中断言日志内容。

### 可用 API（从 setup.js 导入）

| 函数 | 说明 |
|------|------|
| `getConsoleLogs(type?)` | 获取所有收集的日志，可按类型过滤 |
| `clearConsoleLogs()` | 清空日志（建议每个用例开始前调用） |
| `dumpConsoleLogs(type?)` | 打印所有日志到控制台（调试用） |

### 可用 API（从 helpers.js 导入）

| 函数 | 说明 |
|------|------|
| `waitForConsoleMessage(text, options?)` | 轮询等待 console 中出现包含指定文本的日志 |

### 使用示例

```js
const { getMiniProgram, getConsoleLogs, clearConsoleLogs, dumpConsoleLogs } = require('./setup');
const { ensureOnPage, waitForConsoleMessage } = require('./helpers');

it('登录后应输出用户信息日志', async () => {
  clearConsoleLogs(); // 清空之前的日志

  const page = await ensureOnPage(miniProgram, '/pages/login/login');
  await safeTap(page, '.btn-login');
  await sleep(3000);

  // 等待特定日志出现
  const log = await waitForConsoleMessage('login success', { timeout: 5000 });
  expect(log).toBeTruthy();

  // 检查是否有错误日志
  const errors = getConsoleLogs('error');
  expect(errors.length).toBe(0);

  // 调试时打印所有日志
  dumpConsoleLogs();
});
```

---

## 7. 测试文件位置

```
tests/
├── unit/
│   ├── utils.test.js          # utils/util.js 单元测试（25个用例）
│   └── cloudfunctions.test.js # 云函数逻辑测试（17个用例）
└── e2e/
    ├── globalSetup.js         # Jest globalSetup：连接 automator + 登录
    ├── globalTeardown.js      # Jest globalTeardown：清理临时文件
    ├── helpers.js             # 辅助工具函数（sleep/waitForElement/safeTap/addMockMembers 等）
    ├── setup.js               # automator 连接管理（从状态文件读取）
    ├── group.test.js          # 记分组功能 E2E
    ├── match.test.js          # 赛程+分数 E2E
    ├── member.test.js         # 成员详情 E2E
    ├── multiPlayer.test.js    # 多人记分组（4人）E2E（19个用例）
    └── rules.test.js          # 规则设置 E2E
jest.config.e2e.js             # E2E 专用 Jest 配置（含 globalSetup/Teardown）
```

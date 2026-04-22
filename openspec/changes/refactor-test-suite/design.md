## Context

当前项目是一个微信小程序（德州扑克记分板），使用 `miniprogram-automator` + `Jest` 进行 E2E 自动化测试。现有 E2E 测试完全跑不通，核心问题包括：

- 测试用例不处理登录态，直接操作业务页面
- 页面栈管理缺失，`navigateTo` 累积导致溢出
- 多测试文件共享单例连接但各自关闭，导致连接冲突
- 元素操作无安全检查，`null` 元素直接调用方法报错
- 无全局 setup/teardown 机制

现有测试文件结构：
```
tests/e2e/
├── setup.js          # 单例连接管理（被多文件各自 close）
├── group.test.js     # 记分组 E2E（7 个用例）
└── match.test.js     # 赛程 E2E（4 个用例）
```

## Goals / Non-Goals

**Goals:**
- E2E 测试能在开发者工具自动化模式下稳定通过
- 测试用例之间相互独立，不依赖执行顺序
- 每个用例开始前页面状态可预期（已登录、页面栈干净）
- 元素操作有安全保护，不会因 null 元素崩溃
- 保持现有单元测试（42 个用例）不受影响

**Non-Goals:**
- 不改造小程序业务代码（不为测试修改页面逻辑）
- 不引入新的测试框架或依赖
- 不实现 CI/CD 集成（仍需手动启动开发者工具）
- 不 mock 云函数（E2E 测试的价值在于真实环境验证）

## Decisions

### 决策 1：使用 Jest `globalSetup`/`globalTeardown` 管理连接

**选择**：通过 Jest 配置的 `globalSetup` 和 `globalTeardown` 统一管理 automator 连接生命周期。

**理由**：
- 当前每个测试文件各自 `getMiniProgram()` / `closeMiniProgram()`，但共享单例，第一个文件 close 后第二个文件就断连
- `globalSetup` 在所有测试文件之前执行一次，`globalTeardown` 在所有测试文件之后执行一次
- 连接信息通过文件（`/tmp/automator-ws.json`）传递给各测试文件

**替代方案**：
- 方案 B：只在最后一个测试文件 close → 依赖执行顺序，脆弱
- 方案 C：每个文件独立连接 → 开发者工具不支持多连接

### 决策 2：使用 `reLaunch` 替代 `navigateTo` 进行页面导航

**选择**：每个测试用例开始时使用 `reLaunch` 清空页面栈并跳转到目标页面。

**理由**：
- `navigateTo` 会累积页面栈，小程序限制最多 10 层
- `reLaunch` 关闭所有页面并打开目标页面，栈始终只有 1 层
- 每个用例从干净状态开始，互不影响

**替代方案**：
- 方案 B：每个用例结束后 `navigateBack` → 需要精确计算返回层数，容易出错
- 方案 C：用 `redirectTo` → 不能跳转到 tabBar 页面

**注意**：`reLaunch` 可以跳转到任何页面（包括 tabBar 页面），是最通用的导航方式。

### 决策 3：在 globalSetup 中完成登录流程

**选择**：在 `globalSetup` 阶段导航到登录页并触发登录，确保后续所有测试在已登录状态下运行。

**理由**：
- 小程序的 `group/list` 页面 `onShow` 会检查 `app.globalData.openId`，未登录时重定向到 login 页
- 登录状态在小程序实例生命周期内持续有效
- 只需登录一次，所有测试用例共享登录态

**实现方式**：
1. `reLaunch` 到 `/pages/login/login`
2. 查找 `.btn-login` 按钮并 `tap()`
3. 等待页面跳转到 `group/list`（登录成功标志）
4. 如果登录失败（云函数不可用），标记跳过所有 E2E 测试

### 决策 4：封装 E2E 辅助工具函数

**选择**：创建 `tests/e2e/helpers.js`，封装常用操作。

**核心函数**：
- `waitForElement(page, selector, timeout)` — 轮询等待元素出现
- `safeTap(page, selector)` — 安全点击（先等待元素存在）
- `safeInput(page, selector, text)` — 安全输入
- `ensureOnPage(miniProgram, pagePath)` — 确保当前在指定页面（否则 reLaunch）
- `sleep(ms)` — 等待

**理由**：
- 消除所有 `null` 元素操作崩溃
- 统一等待策略，不再硬编码 `sleep` 时间
- 测试用例代码更简洁、可读性更好

## Risks / Trade-offs

- **[登录依赖云环境]** → 如果云函数不可用，所有 E2E 测试将被跳过。缓解：在 globalSetup 中检测登录结果，失败时输出明确提示而非让测试挂起。

- **[reLaunch 性能开销]** → 每个用例都 reLaunch 会比 navigateTo 慢。缓解：E2E 测试本身就慢（~35s），每次 reLaunch 增加约 1-2s，可接受。

- **[globalSetup 不在 Jest worker 中运行]** → `globalSetup` 中的 miniProgram 实例无法直接传递给测试文件，需要通过文件系统或环境变量传递连接信息。缓解：将 ws endpoint 写入临时文件，各测试文件读取后自行 connect。

- **[测试数据污染]** → E2E 测试会在真实数据库中创建数据。缓解：当前阶段可接受，后续可考虑测试专用云环境。

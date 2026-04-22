## Why

当前 E2E 测试用例完全跑不通，存在多个根本性问题：

1. **登录态未处理**：E2E 测试直接 `navigateTo` 到业务页面，但小程序启动后首页是 `pages/index/index`，且 `group/list` 页面的 `onShow` 会触发登录检查（`checkLoginAndLoad`），未登录时会 `redirectTo` 到登录页。测试用例没有先完成登录流程就直接操作业务页面，导致页面状态不可预期。

2. **页面栈溢出**：每个 `it` 用例都调用 `navigateTo` 打开新页面，但从不 `navigateBack`，小程序页面栈最多 10 层，连续多个用例后必然溢出报错。

3. **测试用例之间强耦合**：`group.test.js` 和 `match.test.js` 各自在 `afterAll` 中调用 `closeMiniProgram()`，但它们共享同一个单例连接。如果 `group.test.js` 先执行并关闭连接，`match.test.js` 就无法获取到有效的 miniProgram 实例。

4. **选择器与断言脆弱**：测试依赖 CSS 类名选择器（如 `.btn-primary`、`.input-field`），但没有验证元素是否存在就直接操作，元素为 `null` 时会抛出 `Cannot read property 'tap' of null`。

5. **云函数依赖未隔离**：E2E 测试直接调用真实云函数（`createGroup`、`createMatch`），每次运行都会在数据库中创建脏数据，且依赖网络环境，不稳定。

6. **缺少全局 setup/teardown**：没有 Jest 全局配置来统一管理 automator 连接的生命周期，导致每个测试文件各自管理连接，容易冲突。

## What Changes

- **重写 E2E 测试架构**：引入 Jest `globalSetup`/`globalTeardown` 统一管理 automator 连接生命周期，避免多文件连接冲突
- **新增登录流程处理**：在 E2E 测试开始前先完成登录，确保后续测试在已登录状态下运行
- **重构页面导航策略**：使用 `reLaunch` 替代 `navigateTo` 避免页面栈溢出，每个用例开始前重置页面状态
- **增强元素操作安全性**：所有元素操作前增加 null 检查和等待逻辑，使用辅助函数封装常见操作
- **重构测试用例为独立可运行**：每个测试用例自包含，不依赖其他用例的执行顺序和副作用
- **新增 E2E 测试工具库**：封装 `waitForElement`、`safeTap`、`safeInput`、`ensureOnPage` 等辅助函数

## Capabilities

### New Capabilities
- `e2e-test-infra`: E2E 测试基础设施重构，包括全局 setup/teardown、连接管理、登录流程、辅助工具函数
- `e2e-test-cases`: 基于新基础设施重写的 E2E 测试用例，覆盖记分组和赛程核心流程

### Modified Capabilities

（无已有 spec 需要修改）

## Impact

- **测试文件**：`tests/e2e/` 目录下所有文件将被重写
- **新增文件**：`tests/e2e/helpers.js`（工具函数）、`tests/e2e/globalSetup.js`、`tests/e2e/globalTeardown.js`
- **配置变更**：`package.json` 中 Jest 配置需新增 `globalSetup`/`globalTeardown` 字段
- **依赖**：无新增依赖，仍使用 `miniprogram-automator` + `jest`
- **单元测试**：不受影响，42 个用例保持不变

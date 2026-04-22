## ADDED Requirements

### Requirement: 全局连接生命周期管理
E2E 测试框架 SHALL 通过 Jest `globalSetup` 在所有测试文件执行前建立唯一的 automator 连接，并通过 `globalTeardown` 在所有测试文件执行后关闭连接。各测试文件 SHALL 通过共享的连接信息（ws endpoint）获取 miniProgram 实例，且 MUST NOT 在单个测试文件的 `afterAll` 中关闭全局连接。

#### Scenario: 正常启动和关闭
- **WHEN** 运行 `npm run test:e2e`
- **THEN** globalSetup 连接到 `ws://127.0.0.1:9420` 并将连接信息写入临时文件
- **THEN** 所有测试文件通过临时文件获取连接信息并各自 connect
- **THEN** globalTeardown 在所有测试完成后关闭连接并清理临时文件

#### Scenario: 自动化服务未启动
- **WHEN** 运行 `npm run test:e2e` 但 automator 服务未启动（9420 端口无响应）
- **THEN** globalSetup SHALL 输出明确错误信息 "请先运行 npm run auto:start"
- **THEN** 测试进程 SHALL 以非零退出码终止

### Requirement: 登录态前置处理
E2E 测试框架 SHALL 在 globalSetup 阶段完成小程序登录流程，确保后续所有测试用例在已登录状态下运行。

#### Scenario: 登录成功
- **WHEN** globalSetup 导航到登录页并触发登录按钮
- **THEN** 等待页面跳转到 `group/list`（登录成功标志）
- **THEN** 后续所有测试用例可直接访问业务页面

#### Scenario: 登录失败（云函数不可用）
- **WHEN** 登录云函数调用失败或超时
- **THEN** globalSetup SHALL 输出警告 "登录失败，E2E 测试将跳过需要登录的用例"
- **THEN** 将登录状态标记写入临时文件，测试用例可据此决定是否跳过

### Requirement: 页面导航安全策略
每个 E2E 测试用例 SHALL 使用 `reLaunch` 进行页面导航，确保页面栈始终干净。MUST NOT 使用 `navigateTo` 进行跨用例的页面跳转。

#### Scenario: 普通页面导航
- **WHEN** 测试用例需要访问非 tabBar 页面（如 `group/create/create`）
- **THEN** 使用 `reLaunch('/pages/group/create/create')` 导航
- **THEN** 页面栈中只有 1 个页面

#### Scenario: tabBar 页面导航
- **WHEN** 测试用例需要访问 tabBar 页面（如 `group/list/list`）
- **THEN** 使用 `reLaunch('/pages/group/list/list')` 导航（reLaunch 支持 tabBar 页面）
- **THEN** 页面栈中只有 1 个页面

#### Scenario: 连续多个用例执行
- **WHEN** 连续执行 10 个以上的测试用例
- **THEN** 不会出现页面栈溢出错误

### Requirement: 元素操作安全封装
E2E 测试框架 SHALL 提供安全的元素操作辅助函数，所有元素操作 MUST 在操作前验证元素存在性。

#### Scenario: 元素存在时正常操作
- **WHEN** 调用 `safeTap(page, '.btn-primary')` 且页面上存在 `.btn-primary` 元素
- **THEN** 成功点击该元素

#### Scenario: 元素不存在时优雅失败
- **WHEN** 调用 `safeTap(page, '.non-existent')` 且页面上不存在该元素
- **THEN** 抛出描述性错误 "Element '.non-existent' not found within timeout"
- **THEN** 不会出现 `Cannot read property 'tap' of null` 错误

#### Scenario: 等待元素出现
- **WHEN** 调用 `waitForElement(page, '.loading', 5000)` 且元素在 2 秒后出现
- **THEN** 在元素出现后立即返回元素引用
- **THEN** 不会等满 5 秒

### Requirement: 测试用例独立性
每个 E2E 测试用例 SHALL 独立可运行，MUST NOT 依赖其他用例的执行结果或副作用。

#### Scenario: 单独运行某个用例
- **WHEN** 使用 `jest --testNamePattern "应能进入创建页面"` 单独运行一个用例
- **THEN** 该用例能独立通过（不依赖前置用例的页面状态）

#### Scenario: 调整用例执行顺序
- **WHEN** 改变测试用例的声明顺序
- **THEN** 所有用例仍然能通过

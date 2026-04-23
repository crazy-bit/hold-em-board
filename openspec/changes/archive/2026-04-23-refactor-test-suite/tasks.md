## 1. E2E 测试基础设施

- [x] 1.1 创建 `tests/e2e/helpers.js` — 封装 `sleep`、`waitForElement`、`safeTap`、`safeInput`、`ensureOnPage` 等辅助函数
- [x] 1.2 创建 `tests/e2e/globalSetup.js` — 连接 automator（ws://127.0.0.1:9420），完成登录流程，将连接状态写入临时文件
- [x] 1.3 创建 `tests/e2e/globalTeardown.js` — 清理临时文件（连接由开发者工具管理，无需手动关闭）
- [x] 1.4 重写 `tests/e2e/setup.js` — 改为从临时文件读取连接信息，提供 `getMiniProgram()` 但移除 `closeMiniProgram()` 中的 `close()` 调用

## 2. Jest 配置更新

- [x] 2.1 更新 `package.json` 中 Jest E2E 配置 — 新增 `globalSetup` 和 `globalTeardown` 指向新文件，为 E2E 测试单独配置（通过 `jest.config.e2e.js` 或 `--config` 参数）
- [x] 2.2 更新 `package.json` 中 `test:e2e` 脚本 — 指向新的 E2E Jest 配置

## 3. 重写 E2E 测试用例

- [x] 3.1 重写 `tests/e2e/group.test.js` — 所有用例使用 `reLaunch` 导航，使用 helpers 中的安全操作函数，移除 `afterAll` 中的 `closeMiniProgram()`
- [x] 3.2 重写 `tests/e2e/match.test.js` — 同上，赛程相关用例使用 `reLaunch` 导航，环境变量缺失时使用 `it.skip` 而非 `return`

## 4. 验证与调试

- [x] 4.1 运行 `npm run test:unit` 确认单元测试不受影响（42 个用例全部通过）
- [x] 4.2 启动 `npm run auto:start`，运行 `npm run test:e2e` 验证 E2E 测试通过
- [x] 4.3 更新 `SKILL.md`（verify skill）中的测试文件位置说明，反映新增的 helpers/globalSetup/globalTeardown 文件

/**
 * jest.config.e2e.js
 * E2E 测试专用 Jest 配置
 * 通过 --config 参数指定：jest --config jest.config.e2e.js
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/e2e/**/*.test.js'],
  testTimeout: 60000,
  // E2E 测试必须串行执行（共享同一个开发者工具实例）
  // 通过 --runInBand 参数保证，这里不重复设置
  globalSetup: './tests/e2e/globalSetup.js',
  globalTeardown: './tests/e2e/globalTeardown.js',
  modulePathIgnorePatterns: ['<rootDir>/cloudfunctions/'],
};

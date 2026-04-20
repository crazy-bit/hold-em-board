/**
 * __tests__/e2e/setup.js
 * E2E 测试全局配置
 * 连接已运行的微信开发者工具（需提前开启「服务端口」）
 */
const automator = require('miniprogram-automator');
const path = require('path');

// 微信开发者工具 cli.bat 路径
const CLI_PATH = process.env.WX_CLI_PATH
  || 'D:/微信web开发者工具/cli.bat';

// 项目路径
const PROJECT_PATH = path.resolve(__dirname, '../../');

// 开发者工具自动化 WebSocket 端口
// 启动方式："D:\微信web开发者工具\cli.bat" auto --project <项目路径> --auto-port 9420
// 可通过环境变量覆盖：WX_AUTO_PORT=xxxx npm run test:e2e
const AUTO_PORT = process.env.WX_AUTO_PORT || '9420';

let miniProgram = null;

/**
 * 获取全局 miniProgram 实例（单例）
 * connect 模式：连接已通过 cli auto 启动的自动化实例
 */
async function getMiniProgram() {
  if (miniProgram) return miniProgram;

  miniProgram = await automator.connect({
    wsEndpoint: `ws://127.0.0.1:${AUTO_PORT}`,
  });
  console.log(`✅ 已连接到开发者工具 ws://127.0.0.1:${AUTO_PORT}`);
  return miniProgram;
}

/**
 * 关闭 miniProgram 实例
 */
async function closeMiniProgram() {
  if (miniProgram) {
    try { await miniProgram.close(); } catch (_) {}
    miniProgram = null;
  }
}

module.exports = { getMiniProgram, closeMiniProgram };

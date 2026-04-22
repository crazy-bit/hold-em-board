/**
 * tests/e2e/setup.js
 * E2E 测试连接管理
 * 从 globalSetup 写入的状态文件读取连接信息，提供 miniProgram 单例
 * 支持捕获小程序 console 输出，方便测试中断言日志
 */
const automator = require('miniprogram-automator');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '.e2e-state.json');
const AUTO_PORT = process.env.WX_AUTO_PORT || '9420';

let miniProgram = null;

/**
 * 收集的 console 日志
 * 每条记录格式: { type: 'log'|'warn'|'error'|'info', args: any[], timestamp: number }
 */
let consoleLogs = [];

/**
 * 读取 globalSetup 写入的状态
 */
function readState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (_) {}
  return { wsEndpoint: `ws://127.0.0.1:${AUTO_PORT}`, loggedIn: false };
}

/**
 * 获取全局 miniProgram 实例（单例）
 * 每个 Jest worker 进程内共享同一个连接
 * 连接后自动监听 console 事件，收集小程序日志输出
 */
async function getMiniProgram() {
  if (miniProgram) return miniProgram;

  const state = readState();
  miniProgram = await automator.connect({
    wsEndpoint: state.wsEndpoint,
  });

  // 监听小程序 console 输出，收集到 consoleLogs 数组
  miniProgram.on('console', (msg) => {
    const entry = {
      type: msg.type || 'log',
      args: msg.args || [],
      text: String(msg.args || ''),
      timestamp: Date.now(),
    };
    consoleLogs.push(entry);

    // 同时输出到 Node 控制台，方便实时查看
    const prefix = `[小程序 ${entry.type.toUpperCase()}]`;
    console.log(`${prefix} ${entry.text}`);
  });

  return miniProgram;
}

/**
 * 获取登录状态
 */
function isLoggedIn() {
  const state = readState();
  return state.loggedIn;
}

/**
 * 释放当前 worker 的连接引用（不关闭 automator 服务）
 * 注意：不调用 miniProgram.close()，避免影响其他测试文件
 */
async function releaseMiniProgram() {
  miniProgram = null;
}

/**
 * 获取收集到的所有 console 日志
 * @param {string} [type] 可选，按类型过滤（'log'|'warn'|'error'|'info'）
 * @returns {Array} 日志条目数组
 */
function getConsoleLogs(type) {
  if (type) {
    return consoleLogs.filter((entry) => entry.type === type);
  }
  return [...consoleLogs];
}

/**
 * 清空已收集的 console 日志
 * 建议在每个测试用例开始前调用，避免日志互相干扰
 */
function clearConsoleLogs() {
  consoleLogs = [];
}

/**
 * 打印所有收集到的日志（用于调试）
 * @param {string} [type] 可选，按类型过滤
 */
function dumpConsoleLogs(type) {
  const logs = type ? consoleLogs.filter((e) => e.type === type) : consoleLogs;
  console.log(`\n📋 小程序 Console 日志（共 ${logs.length} 条）:`);
  logs.forEach((entry, i) => {
    const time = new Date(entry.timestamp).toLocaleTimeString();
    console.log(`  [${i + 1}] ${time} [${entry.type.toUpperCase()}] ${entry.text}`);
  });
}

module.exports = { getMiniProgram, releaseMiniProgram, isLoggedIn, getConsoleLogs, clearConsoleLogs, dumpConsoleLogs };

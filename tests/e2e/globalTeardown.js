/**
 * tests/e2e/globalTeardown.js
 * Jest globalTeardown — 在所有 E2E 测试文件执行后运行一次
 * 职责：清理临时状态文件
 */
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, '.e2e-state.json');

module.exports = async function globalTeardown() {
  // 清理临时状态文件
  try {
    if (fs.existsSync(STATE_FILE)) {
      fs.unlinkSync(STATE_FILE);
      console.log('\n🧹 已清理 E2E 状态文件');
    }
  } catch (err) {
    console.warn(`⚠️ 清理状态文件失败: ${err.message}`);
  }
};

/**
 * tests/e2e/globalSetup.js
 * Jest globalSetup — 在所有 E2E 测试文件执行前运行一次
 * 职责：连接 automator、完成登录流程、将状态写入临时文件
 */
const automator = require('miniprogram-automator');
const fs = require('fs');
const path = require('path');

const AUTO_PORT = process.env.WX_AUTO_PORT || '9420';
const WS_ENDPOINT = `ws://127.0.0.1:${AUTO_PORT}`;
const STATE_FILE = path.join(__dirname, '.e2e-state.json');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = async function globalSetup() {
  console.log('\n🔌 正在连接开发者工具自动化服务...');

  let miniProgram;
  try {
    miniProgram = await automator.connect({ wsEndpoint: WS_ENDPOINT });
  } catch (err) {
    console.error(`\n❌ 连接失败: ${err.message}`);
    console.error('请先运行 npm run auto:start 启动自动化服务');
    process.exit(1);
  }

  console.log(`✅ 已连接到 ${WS_ENDPOINT}`);

  // 尝试登录
  let loggedIn = false;
  try {
    console.log('🔑 正在执行登录流程...');

    // 导航到登录页
    await miniProgram.reLaunch('/pages/login/login');
    await sleep(1500);

    const page = await miniProgram.currentPage();

    // 检查是否已经被重定向到列表页（说明已登录）
    if (page.path.includes('group/list')) {
      console.log('✅ 已处于登录状态，跳过登录');
      loggedIn = true;
    } else if (page.path.includes('login')) {
      // 查找登录按钮并点击
      const loginBtn = await page.$('.btn-login');
      if (loginBtn) {
        await loginBtn.tap();
        console.log('⏳ 等待登录响应...');
        await sleep(5000);

        const afterPage = await miniProgram.currentPage();
        if (afterPage.path.includes('group/list')) {
          console.log('✅ 登录成功');
          loggedIn = true;
        } else {
          console.warn(`⚠️ 登录后页面: ${afterPage.path}，可能登录失败`);
        }
      } else {
        // 可能正在 loading 状态
        console.warn('⚠️ 未找到登录按钮，可能正在加载中');
      }
    } else {
      console.warn(`⚠️ 意外页面: ${page.path}`);
    }
  } catch (err) {
    console.warn(`⚠️ 登录流程异常: ${err.message}`);
  }

  // 将状态写入临时文件，供各测试文件读取
  const state = {
    wsEndpoint: WS_ENDPOINT,
    loggedIn,
    timestamp: Date.now(),
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.log(`📝 状态已写入 ${STATE_FILE}`);

  // 注意：不能调用 miniProgram.close()，它会关闭 automator 服务端
  // globalSetup 运行在独立进程中，miniProgram 实例无法传递给 worker
  // 使用 disconnect() 仅断开当前客户端连接，保留服务端运行
  if (miniProgram.disconnect) {
    await miniProgram.disconnect();
  }
  // 如果没有 disconnect 方法，直接让进程结束即可，不调用 close()
};

const automator = require('miniprogram-automator');

(async () => {
  let miniProgram;
  try {
    miniProgram = await automator.connect({ wsEndpoint: 'ws://127.0.0.1:9420' });
    
    // 截图首页
    const page1 = await miniProgram.currentPage();
    console.log('当前页面:', page1.path);
    
    // 跳转到首页
    await miniProgram.switchTab('/pages/index/index');
    await new Promise(r => setTimeout(r, 2000));
    const indexPage = await miniProgram.currentPage();
    await indexPage.waitFor(1000);
    const shot1 = await miniProgram.screenshot();
    require('fs').writeFileSync('tests/e2e/image/test-output/verify_index.png', shot1);
    console.log('首页截图已保存');

    // 跳转到赛事详情（如果有的话）
    await miniProgram.switchTab('/pages/group/list/list');
    await new Promise(r => setTimeout(r, 2000));
    const listPage = await miniProgram.currentPage();
    const shot2 = await miniProgram.screenshot();
    require('fs').writeFileSync('tests/e2e/image/test-output/verify_list.png', shot2);
    console.log('赛事列表截图已保存');

  } catch (e) {
    console.error('Error:', e.message);
  }
})();

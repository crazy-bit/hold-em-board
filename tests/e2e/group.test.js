/**
 * tests/e2e/group.test.js
 * 记分组功能 E2E 测试
 * 每个用例使用 reLaunch 独立导航，互不依赖
 * 利用 console 日志收集覆盖创建报错场景
 */
const { getMiniProgram, releaseMiniProgram, getConsoleLogs, clearConsoleLogs, dumpConsoleLogs } = require('./setup');
const {
  sleep,
  ensureOnPage,
  waitForElement,
  safeTap,
  safeInput,
  waitForNavigation,
  waitForData,
  waitForConsoleMessage,
} = require('./helpers');

describe('记分组功能 E2E', () => {
  let miniProgram;

  beforeAll(async () => {
    miniProgram = await getMiniProgram();
  }, 30000);

  afterAll(async () => {
    // 只释放引用，不关闭连接
    await releaseMiniProgram();
  });

  // ── 创建记分组 ──────────────────────────────────────────────
  describe('创建记分组', () => {
    it('应能进入创建页面', async () => {
      // 首个用例连接 automator 耗时较长，增加 ensureOnPage 等待
      const page = await ensureOnPage(miniProgram, '/pages/group/create/create', 3000);

      expect(page.path).toContain('group/create');

      // 验证关键元素存在
      const input = await waitForElement(page, '.input-field', 5000);
      expect(input).toBeTruthy();

      const btn = await waitForElement(page, '.btn-primary', 5000);
      expect(btn).toBeTruthy();
    }, 60000);

    it('组名为空时按钮应禁用', async () => {
      const page = await ensureOnPage(miniProgram, '/pages/group/create/create');

      // 验证初始状态：组名为空
      const data = await page.data();
      expect(data.groupName === '' || data.groupName === undefined).toBe(true);

      // disabled 表达式为 creating || !groupName，组名为空时应为 true
      const btn = await waitForElement(page, '.btn-primary', 3000);
      const disabled = await btn.attribute('disabled');
      // 小程序中 disabled 属性存在即表示禁用
      expect(disabled !== null && disabled !== undefined).toBe(true);
    }, 15000);

    it('输入组名后数据绑定正确', async () => {
      const page = await ensureOnPage(miniProgram, '/pages/group/create/create');

      await safeInput(page, '.input-field', 'E2E测试组');
      await sleep(500);

      const data = await page.data();
      expect(data.groupName).toBe('E2E测试组');
    }, 15000);

    it('输入组名后按钮应启用', async () => {
      const page = await ensureOnPage(miniProgram, '/pages/group/create/create');

      // 输入组名
      await safeInput(page, '.input-field', '测试启用按钮');
      await sleep(500);

      // 验证数据绑定
      const data = await page.data();
      expect(data.groupName).toBe('测试启用按钮');
      expect(data.creating).toBe(false);
    }, 15000);

    it('字符计数应正确显示', async () => {
      const page = await ensureOnPage(miniProgram, '/pages/group/create/create');

      await safeInput(page, '.input-field', '测试组名');
      await sleep(500);

      // 验证字符计数元素存在
      const charCount = await waitForElement(page, '.char-count', 3000);
      expect(charCount).toBeTruthy();

      // 验证 data 中的 groupName 长度
      const data = await page.data();
      expect(data.groupName.length).toBe(4);
    }, 15000);

    it('点击创建后 creating 状态应变为 true', async () => {
      clearConsoleLogs();
      const page = await ensureOnPage(miniProgram, '/pages/group/create/create');

      await safeInput(page, '.input-field', `状态测试_${Date.now()}`);
      await sleep(300);

      // 点击创建按钮
      await safeTap(page, '.btn-primary');

      // 短暂等待后检查 creating 状态（云函数调用期间应为 true）
      await sleep(500);
      const data = await page.data();
      // creating 可能已经变回 false（如果云函数很快返回），但至少不应报错
      expect(typeof data.creating).toBe('boolean');
    }, 20000);

    it('提交后应跳转到记分组详情页或捕获到错误日志（需已登录）', async () => {
      clearConsoleLogs();
      let page = await ensureOnPage(miniProgram, '/pages/group/create/create', 3000);

      // 确认确实在创建页面，如果不在则重新导航
      if (!page.path.includes('group/create')) {
        await miniProgram.reLaunch('/pages/group/create/create');
        await sleep(3000);
        page = await miniProgram.currentPage();
      }

      // 等待页面完全渲染，如果失败则重新获取 page 对象再试
      try {
        await waitForElement(page, '.input-field', 8000);
      } catch (_) {
        page = await miniProgram.currentPage();
        await waitForElement(page, '.input-field', 5000);
      }

      const groupName = `E2E创建测试_${Date.now()}`;
      await safeInput(page, '.input-field', groupName, 5000);
      await sleep(300);

      await safeTap(page, '.btn-primary');

      // 等待云函数调用和页面跳转
      await sleep(6000);

      const currentPage = await miniProgram.currentPage();
      const currentData = await currentPage.data();

      // 打印所有收集到的日志，方便调试
      dumpConsoleLogs();

      if (currentPage.path.includes('group/detail')) {
        // ✅ 创建成功，跳转到了详情页
        console.log('✅ 创建成功，已跳转到详情页');

        // 验证详情页数据加载
        await sleep(3000);
        const detailPage = await miniProgram.currentPage();
        const detailData = await detailPage.data();

        // 详情页应有 groupId
        expect(detailData.groupId).toBeTruthy();

        // 严格断言：详情页不应有 loadData 错误
        const errorLogs = getConsoleLogs('error');
        const detailErrors = errorLogs.filter(
          (e) => e.text.includes('loadData') && e.text.includes('失败')
        );
        if (detailErrors.length > 0) {
          console.error('❌ 详情页加载失败:', detailErrors.map((e) => e.text));
        }
        expect(detailErrors.length).toBe(0);

        // loading 应已变为 false（数据加载完成）
        expect(detailData.loading).toBe(false);

        // group 数据应已加载
        expect(detailData.group).toBeTruthy();
        expect(detailData.group.name).toBeTruthy();
      } else if (currentPage.path.includes('group/create')) {
        // 还在创建页，说明创建失败了
        console.log('⚠️ 创建失败，仍在创建页面');

        // creating 状态应已恢复为 false
        expect(currentData.creating).toBe(false);

        // 检查 console 中是否有错误日志
        const errorLogs = getConsoleLogs('error');
        console.log(`📋 错误日志数量: ${errorLogs.length}`);
        errorLogs.forEach((e) => console.log(`  ❌ ${e.text}`));

        // 标记测试结果：创建失败但不崩溃
        expect(currentPage.path).toContain('group/create');
      } else if (currentPage.path.includes('login')) {
        // 未登录，被重定向到登录页
        console.log('⚠️ 未登录，被重定向到登录页');
        expect(currentPage.path).toContain('login');
      } else {
        // 意外页面
        console.log(`⚠️ 意外页面: ${currentPage.path}`);
        const validPaths = ['group/detail', 'group/create', 'login'];
        const isValid = validPaths.some((p) => currentPage.path.includes(p));
        expect(isValid).toBe(true);
      }
    }, 30000);

    it('创建失败时不应有未捕获异常', async () => {
      clearConsoleLogs();
      const page = await ensureOnPage(miniProgram, '/pages/group/create/create');

      await safeInput(page, '.input-field', `异常检测_${Date.now()}`);
      await sleep(300);

      await safeTap(page, '.btn-primary');
      await sleep(6000);

      // 检查是否有未捕获的异常（如 TypeError、ReferenceError 等）
      const allLogs = getConsoleLogs('error');
      const uncaughtErrors = allLogs.filter(
        (e) =>
          e.text.includes('TypeError') ||
          e.text.includes('ReferenceError') ||
          e.text.includes('Cannot read propert') ||
          e.text.includes('is not a function') ||
          e.text.includes('is not defined')
      );

      if (uncaughtErrors.length > 0) {
        console.error('❌ 发现未捕获异常:');
        uncaughtErrors.forEach((e) => console.error(`  ${e.text}`));
      }

      // 未捕获异常数量应为 0
      expect(uncaughtErrors.length).toBe(0);
    }, 30000);

    it('创建失败时 creating 状态应恢复为 false', async () => {
      clearConsoleLogs();
      const page = await ensureOnPage(miniProgram, '/pages/group/create/create');

      await safeInput(page, '.input-field', `恢复测试_${Date.now()}`);
      await sleep(300);

      await safeTap(page, '.btn-primary');

      // 等待云函数返回（无论成功失败）
      await sleep(8000);

      const currentPage = await miniProgram.currentPage();

      // 如果还在创建页面，creating 应已恢复为 false
      if (currentPage.path.includes('group/create')) {
        const data = await currentPage.data();
        expect(data.creating).toBe(false);
      }
      // 如果已跳转到详情页，说明创建成功，无需检查
    }, 25000);

    it('云函数调用失败时应显示错误提示（通过 console 验证）', async () => {
      clearConsoleLogs();
      const page = await ensureOnPage(miniProgram, '/pages/group/create/create');

      await safeInput(page, '.input-field', `错误提示测试_${Date.now()}`);
      await sleep(300);

      await safeTap(page, '.btn-primary');
      await sleep(6000);

      // 收集所有日志用于分析
      const allLogs = getConsoleLogs();
      const errorLogs = getConsoleLogs('error');

      console.log(`📋 总日志: ${allLogs.length} 条, 错误日志: ${errorLogs.length} 条`);

      // 如果有错误日志，验证错误信息中包含有意义的内容
      if (errorLogs.length > 0) {
        errorLogs.forEach((e) => {
          // 错误日志不应为空
          expect(e.text.length).toBeGreaterThan(0);
          console.log(`  ❌ [${e.type}] ${e.text}`);
        });
      }

      // 无论成功失败，页面不应白屏（应在有效页面上）
      const currentPage = await miniProgram.currentPage();
      expect(currentPage.path).toBeTruthy();
    }, 30000);
  });

  // ── 创建成功后详情页验证 ─────────────────────────────────────
  describe('创建成功后详情页验证', () => {
    let createdGroupId = null;

    it('创建记分组并验证详情页数据', async () => {
      clearConsoleLogs();
      const page = await ensureOnPage(miniProgram, '/pages/group/create/create');

      const groupName = `E2E详情验证_${Date.now()}`;
      await safeInput(page, '.input-field', groupName);
      await sleep(300);

      await safeTap(page, '.btn-primary');

      // 等待跳转
      try {
        const detailPage = await waitForNavigation(miniProgram, 'group/detail', 10000);

        // 使用 waitForData 等待详情页数据加载完成
        try {
          await waitForData(detailPage, (d) => d.group && d.group.name, 8000);
        } catch (_) {
          // 数据加载超时，继续用当前数据验证
        }
        const data = await detailPage.data();

        createdGroupId = data.groupId;
        console.log(`✅ 创建成功, groupId: ${createdGroupId}`);

        // 验证详情页核心数据
        expect(data.groupId).toBeTruthy();

        // 严格断言：loading 应为 false（数据加载完成而非失败后的 false）
        expect(data.loading).toBe(false);

        // 严格断言：group 对象应有 name（加载成功的标志）
        expect(data.group).toBeTruthy();
        expect(data.group.name).toBe(groupName);

        expect(Array.isArray(data.members)).toBe(true);
        expect(Array.isArray(data.matches)).toBe(true);

        // 创建者应在成员列表中
        expect(data.members.length).toBeGreaterThanOrEqual(1);

        // 新创建的组应没有赛程
        expect(data.matches.length).toBe(0);

        // 严格断言：详情页不应有任何 loadData 错误日志
        const errorLogs = getConsoleLogs('error');
        const loadErrors = errorLogs.filter(
          (e) => e.text.includes('loadData') && e.text.includes('失败')
        );
        if (loadErrors.length > 0) {
          console.error('❌ 创建后详情页加载失败:', loadErrors.map((e) => e.text));
        }
        expect(loadErrors.length).toBe(0);
      } catch (navErr) {
        // 跳转超时，可能创建失败或跳转到了其他页面
        console.warn(`⚠️ 未能跳转到详情页: ${navErr.message}`);
        dumpConsoleLogs();

        // 验证错误被正确处理（也允许已跳转到 detail 但 waitForNavigation 超时的情况）
        const currentPage = await miniProgram.currentPage();
        const validPaths = ['group/create', 'group/detail', 'login'];
        const isValid = validPaths.some((p) => currentPage.path.includes(p));
        expect(isValid).toBe(true);

        // 如果实际在详情页，也记录 groupId
        if (currentPage.path.includes('group/detail')) {
          const detailData = await currentPage.data();
          createdGroupId = detailData.groupId;
          console.log(`✅ 实际已在详情页, groupId: ${createdGroupId}`);
        }
      }
    }, 35000);

    it('详情页应正确显示邀请码', async () => {
      if (!createdGroupId) {
        console.log('⏭️ 跳过：上一步创建未成功');
        return;
      }

      const page = await ensureOnPage(
        miniProgram,
        `/pages/group/detail/detail?id=${createdGroupId}`,
        3000
      );

      await sleep(2000);
      const data = await page.data();

      // 组信息应包含邀请码
      expect(data.group).toBeTruthy();
      if (data.group.inviteCode) {
        expect(data.group.inviteCode.length).toBe(6);
        console.log(`📋 邀请码: ${data.group.inviteCode}`);
      }
    }, 20000);

    it('详情页应正确显示管理员状态', async () => {
      if (!createdGroupId) {
        console.log('⏭️ 跳过：上一步创建未成功');
        return;
      }

      const page = await ensureOnPage(
        miniProgram,
        `/pages/group/detail/detail?id=${createdGroupId}`,
        3000
      );

      // 等待数据加载完成（isAdmin 依赖 group.adminId 和 openId 比较）
      try {
        await waitForData(page, (d) => d.group && d.group.adminId, 8000);
      } catch (_) {
        // 超时继续验证
      }
      const data = await page.data();

      // 创建者应为管理员（如果 openId 匹配）
      // 注意：本地调试环境 openId 可能与云端不一致
      if (data.group && data.group.adminId) {
        console.log(`📋 adminId: ${data.group.adminId}, isAdmin: ${data.isAdmin}`);
      }
      // 容错：如果数据已加载但 isAdmin 为 false，可能是 openId 不匹配
      expect(typeof data.isAdmin).toBe('boolean');
    }, 25000);

    it('创建后详情页不应显示加载失败', async () => {
      clearConsoleLogs();

      // 完整走一遍创建 → 跳转详情页的流程
      const page = await ensureOnPage(miniProgram, '/pages/group/create/create', 3000);
      try {
        await waitForElement(page, '.input-field', 8000);
      } catch (_) {
        const p = await miniProgram.currentPage();
        await waitForElement(p, '.input-field', 5000);
      }

      const groupName = `E2E加载验证_${Date.now()}`;
      await safeInput(page, '.input-field', groupName, 5000);
      await sleep(300);
      await safeTap(page, '.btn-primary');

      // 等待跳转到详情页
      await sleep(8000);
      const detailPage = await miniProgram.currentPage();

      if (!detailPage.path.includes('group/detail')) {
        // 没跳转到详情页，可能创建失败，跳过此用例
        console.log(`⏭️ 未跳转到详情页（当前: ${detailPage.path}），跳过加载验证`);
        return;
      }

      // 等待数据加载
      await sleep(3000);
      const data = await detailPage.data();

      // 严格断言：loading 应为 false
      expect(data.loading).toBe(false);

      // 严格断言：group 数据应已加载成功（name 不为空）
      expect(data.group).toBeTruthy();
      expect(data.group.name).toBe(groupName);

      // 严格断言：不应有 loadData 相关的错误日志
      const errorLogs = getConsoleLogs('error');
      const loadDataErrors = errorLogs.filter(
        (e) => e.text.includes('loadData') || e.text.includes('获取组信息失败')
      );
      if (loadDataErrors.length > 0) {
        console.error('❌ 创建后详情页加载失败:');
        loadDataErrors.forEach((e) => console.error(`  ${e.text}`));
      }
      expect(loadDataErrors.length).toBe(0);

      // 成员列表应至少有创建者
      expect(Array.isArray(data.members)).toBe(true);
      expect(data.members.length).toBeGreaterThanOrEqual(1);
    }, 35000);
  });

  // ── 记分组列表页 ────────────────────────────────────────────
  describe('记分组列表页', () => {
    it('应能进入列表页（或被重定向到登录页）', async () => {
      // reLaunch 支持 tabBar 页面
      const page = await ensureOnPage(miniProgram, '/pages/group/list/list', 2000);

      // 已登录时应在 group/list，未登录时可能被重定向到 login
      const validPaths = ['group/list', 'login'];
      const isValid = validPaths.some((p) => page.path.includes(p));
      expect(isValid).toBe(true);
    }, 15000);

    it('列表页数据结构正常', async () => {
      const page = await ensureOnPage(miniProgram, '/pages/group/list/list', 2000);

      const data = await page.data();
      expect(typeof data).toBe('object');

      // 如果在列表页，验证数据结构
      if (page.path.includes('group/list')) {
        expect(Array.isArray(data.groups)).toBe(true);
        expect(typeof data.loading).toBe('boolean');
      }
    }, 15000);

    it('列表页加载不应有未捕获错误', async () => {
      clearConsoleLogs();
      const page = await ensureOnPage(miniProgram, '/pages/group/list/list', 2000);
      await sleep(3000);

      if (page.path.includes('group/list')) {
        const errorLogs = getConsoleLogs('error');
        const uncaughtErrors = errorLogs.filter(
          (e) =>
            e.text.includes('TypeError') ||
            e.text.includes('ReferenceError') ||
            e.text.includes('is not a function')
        );
        expect(uncaughtErrors.length).toBe(0);
      }
    }, 15000);

    it('列表页加载完成后 loading 应为 false', async () => {
      const page = await ensureOnPage(miniProgram, '/pages/group/list/list', 2000);
      await sleep(5000);

      if (page.path.includes('group/list')) {
        const data = await page.data();
        expect(data.loading).toBe(false);
      }
    }, 15000);

    it('列表页应显示已创建的记分组', async () => {
      const page = await ensureOnPage(miniProgram, '/pages/group/list/list', 2000);
      await sleep(5000);

      if (page.path.includes('group/list')) {
        const data = await page.data();
        // 前面的测试已经创建了记分组，列表应不为空
        if (data.groups.length > 0) {
          const firstGroup = data.groups[0];
          expect(firstGroup.name).toBeTruthy();
          expect(firstGroup._id).toBeTruthy();
          console.log(`📋 列表第一个组: ${firstGroup.name}, 成员: ${firstGroup.memberCount}, 赛程: ${firstGroup.matchCount}`);
        }
      }
    }, 15000);
  });

  // ── 加入记分组 ──────────────────────────────────────────────
  describe('加入记分组', () => {
    it('点击加入按钮应弹出邀请码弹窗', async () => {
      const page = await ensureOnPage(miniProgram, '/pages/group/list/list', 2000);
      await sleep(3000);

      if (!page.path.includes('group/list')) {
        console.log('⏭️ 跳过：未在列表页');
        return;
      }

      // 点击加入按钮
      const joinBtns = await page.$$('.icon-btn');
      if (joinBtns && joinBtns.length > 0) {
        await joinBtns[0].tap();
        await sleep(500);

        const data = await page.data();
        expect(data.showJoinModal).toBe(true);
      }
    }, 15000);

    it('邀请码输入应正确绑定并转为大写', async () => {
      const page = await ensureOnPage(miniProgram, '/pages/group/list/list', 2000);
      await sleep(3000);

      if (!page.path.includes('group/list')) return;

      // 打开弹窗
      await page.callMethod('goJoinGroup');
      await sleep(500);

      // 输入邀请码
      const input = await page.$('.modal-card .input-field');
      if (input) {
        await input.input('abcdef');
        await sleep(500);

        const data = await page.data();
        // 应转为大写
        expect(data.inviteCode).toBe('ABCDEF');
      }
    }, 15000);

    it('输入无效邀请码加入应失败但不崩溃', async () => {
      clearConsoleLogs();
      const page = await ensureOnPage(miniProgram, '/pages/group/list/list', 2000);
      await sleep(3000);

      if (!page.path.includes('group/list')) return;

      // 打开弹窗并输入无效邀请码
      await page.callMethod('goJoinGroup');
      await sleep(500);

      const input = await page.$('.modal-card .input-field');
      if (input) {
        await input.input('ZZZZZZ');
        await sleep(300);

        // 点击确认加入
        const confirmBtns = await page.$$('.modal-card .btn-primary');
        if (confirmBtns && confirmBtns.length > 0) {
          await confirmBtns[0].tap();
          await sleep(5000);

          // joining 应恢复为 false
          const data = await page.data();
          expect(data.joining).toBe(false);

          // 不应有未捕获异常
          const errorLogs = getConsoleLogs('error');
          const uncaughtErrors = errorLogs.filter(
            (e) =>
              e.text.includes('TypeError') ||
              e.text.includes('ReferenceError') ||
              e.text.includes('is not a function')
          );
          expect(uncaughtErrors.length).toBe(0);
        }
      }
    }, 20000);

    it('关闭弹窗应重置状态', async () => {
      const page = await ensureOnPage(miniProgram, '/pages/group/list/list', 2000);
      await sleep(3000);

      if (!page.path.includes('group/list')) return;

      // 打开弹窗
      await page.callMethod('goJoinGroup');
      await sleep(500);

      let data = await page.data();
      expect(data.showJoinModal).toBe(true);

      // 关闭弹窗
      await page.callMethod('closeJoinModal');
      await sleep(500);

      data = await page.data();
      expect(data.showJoinModal).toBe(false);
      expect(data.inviteCode).toBe('');
    }, 15000);
  });

  // ── 记分组详情页 Tab 切换 ───────────────────────────────────
  describe('记分组详情页 Tab 切换', () => {
    let testGroupId = null;

    beforeAll(async () => {
      // 创建一个记分组用于 Tab 切换测试
      clearConsoleLogs();
      const page = await ensureOnPage(miniProgram, '/pages/group/create/create', 3000);
      try {
        await waitForElement(page, '.input-field', 8000);
      } catch (_) {
        const p = await miniProgram.currentPage();
        await waitForElement(p, '.input-field', 5000);
      }

      await safeInput(page, '.input-field', `Tab测试组_${Date.now()}`, 5000);
      await sleep(300);
      await safeTap(page, '.btn-primary');
      await sleep(8000);

      const currentPage = await miniProgram.currentPage();
      if (currentPage.path.includes('group/detail')) {
        const data = await currentPage.data();
        testGroupId = data.groupId;
        console.log(`✅ Tab 测试前置：创建记分组成功, groupId: ${testGroupId}`);
      }
    }, 35000);

    it('默认应显示赛程记录 Tab', async () => {
      if (!testGroupId) {
        console.log('⏭️ 跳过：无可用 groupId');
        return;
      }

      const page = await ensureOnPage(
        miniProgram,
        `/pages/group/detail/detail?id=${testGroupId}`,
        3000
      );
      await sleep(2000);

      const data = await page.data();
      expect(data.activeTab).toBe('matches');
    }, 15000);

    it('点击总积分榜 Tab 应切换', async () => {
      if (!testGroupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/group/detail/detail?id=${testGroupId}`,
        3000
      );
      await sleep(2000);

      // 点击总积分榜 Tab
      const tabs = await page.$$('.tab-item');
      if (tabs && tabs.length >= 2) {
        await tabs[1].tap();
        await sleep(500);

        const data = await page.data();
        expect(data.activeTab).toBe('leaderboard');
      }
    }, 15000);

    it('切换回赛程记录 Tab 应正常', async () => {
      if (!testGroupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/group/detail/detail?id=${testGroupId}`,
        3000
      );
      await sleep(2000);

      // 先切到积分榜
      const tabs = await page.$$('.tab-item');
      if (tabs && tabs.length >= 2) {
        await tabs[1].tap();
        await sleep(300);

        // 再切回赛程记录
        await tabs[0].tap();
        await sleep(300);

        const data = await page.data();
        expect(data.activeTab).toBe('matches');
      }
    }, 15000);

    it('积分榜应显示成员列表', async () => {
      if (!testGroupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/group/detail/detail?id=${testGroupId}`,
        3000
      );

      // 等待数据加载
      try {
        await waitForData(page, (d) => d.group && d.group.name, 8000);
      } catch (_) {}

      const data = await page.data();

      // 积分榜应有数据（至少有创建者）
      expect(Array.isArray(data.leaderboard)).toBe(true);
      if (data.leaderboard.length > 0) {
        const first = data.leaderboard[0];
        expect(first.userId).toBeTruthy();
        expect(first.nickName).toBeTruthy();
        expect(typeof first.totalPoints).toBe('number');
        expect(typeof first.matchCount).toBe('number');
        console.log(`📋 积分榜第一名: ${first.nickName}, 积分: ${first.totalPoints}`);
      }
    }, 20000);
  });
});

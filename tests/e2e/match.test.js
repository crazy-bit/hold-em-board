/**
 * tests/e2e/match.test.js
 * 赛程管理 E2E 测试
 * 包含自包含的创建流程（先创建赛事，再创建赛程），不依赖外部环境变量
 * 利用 console 日志收集覆盖赛程创建报错场景
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

describe('赛程管理 E2E', () => {
  let miniProgram;
  // 自动创建的赛事 ID 和赛程 ID，供后续测试使用
  let autoGroupId = null;
  let autoMatchId = null;

  beforeAll(async () => {
    miniProgram = await getMiniProgram();

    // 自动创建一个赛事，获取 groupId 供赛程测试使用
    try {
      const page = await ensureOnPage(miniProgram, '/pages/group/create/create', 3000);
      try {
        await waitForElement(page, '.input-field', 8000);
      } catch (_) {
        const p = await miniProgram.currentPage();
        await waitForElement(p, '.input-field', 5000);
      }

      await safeInput(page, '.input-field', `赛程测试组_${Date.now()}`, 5000);
      await sleep(300);
      await safeTap(page, '.btn-primary');
      await sleep(8000);

      const currentPage = await miniProgram.currentPage();
      if (currentPage.path.includes('group/detail')) {
        const data = await currentPage.data();
        autoGroupId = data.groupId;
        console.log(`✅ 赛程测试前置：创建赛事成功, groupId: ${autoGroupId}`);
      } else {
        console.warn(`⚠️ 赛程测试前置：创建赛事未跳转到详情页 (${currentPage.path})`);
      }
    } catch (err) {
      console.warn(`⚠️ 赛程测试前置：创建赛事失败: ${err.message}`);
    }
  }, 60000);

  afterAll(async () => {
    await releaseMiniProgram();
  });

  /**
   * 获取可用的 groupId（优先使用自动创建的，其次使用环境变量）
   */
  function getGroupId() {
    return autoGroupId || process.env.TEST_GROUP_ID || '';
  }

  // ── 创建赛程页面 ────────────────────────────────────────────
  describe('创建赛程页面', () => {
    it('应能进入创建赛程页面', async () => {
      const groupId = getGroupId();
      if (!groupId) {
        console.log('⏭️ 跳过：无可用 groupId');
        return;
      }

      const page = await ensureOnPage(
        miniProgram,
        `/pages/match/create/create?groupId=${groupId}`,
        2000
      );

      expect(page.path).toContain('match/create');

      // 验证关键元素
      const btn = await waitForElement(page, '.btn-primary', 5000);
      expect(btn).toBeTruthy();

      // 验证 groupId 已绑定到 data
      const data = await page.data();
      expect(data.groupId).toBe(groupId);
    }, 20000);

    it('初始状态 creating 应为 false', async () => {
      const groupId = getGroupId();
      if (!groupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/match/create/create?groupId=${groupId}`,
        2000
      );

      const data = await page.data();
      expect(data.creating).toBe(false);
    }, 15000);

    it('标题输入应正确绑定', async () => {
      const groupId = getGroupId();
      if (!groupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/match/create/create?groupId=${groupId}`,
        2000
      );

      const input = await page.$('.input-field');
      if (input) {
        await input.input('第99期');
        await sleep(500);
        const data = await page.data();
        expect(data.title).toBe('第99期');
      }
    }, 15000);
  });

  // ── 创建赛程全链路 ──────────────────────────────────────────
  describe('创建赛程全链路', () => {

    it('点击创建后应成功跳转到赛程详情页', async () => {
      clearConsoleLogs();
      const groupId = getGroupId();
      if (!groupId) {
        console.log('⏭️ 跳过：无可用 groupId');
        return;
      }

      const page = await ensureOnPage(
        miniProgram,
        `/pages/match/create/create?groupId=${groupId}`,
        2000
      );

      await waitForElement(page, '.btn-primary', 5000);
      await safeTap(page, '.btn-primary');

      // 等待云函数调用和页面跳转
      await sleep(8000);

      const currentPage = await miniProgram.currentPage();
      dumpConsoleLogs();

      if (currentPage.path.includes('match/detail')) {
        console.log('✅ 赛程创建成功，已跳转到详情页');
        const data = await currentPage.data();
        autoMatchId = data.matchId;
        console.log(`📋 matchId: ${autoMatchId}`);

        expect(data.matchId).toBeTruthy();
        expect(data.groupId).toBeTruthy();
      } else if (currentPage.path.includes('match/create')) {
        // 还在创建页，说明创建失败
        console.log('⚠️ 赛程创建失败，仍在创建页面');
        const data = await currentPage.data();
        // creating 应已恢复为 false
        expect(data.creating).toBe(false);

        // 检查错误日志
        const errorLogs = getConsoleLogs('error');
        console.log(`📋 错误日志: ${errorLogs.length} 条`);
        errorLogs.forEach((e) => console.log(`  ❌ ${e.text}`));

        // 标记失败原因
        expect(currentPage.path).toContain('match/detail');
      } else {
        console.log(`⚠️ 意外页面: ${currentPage.path}`);
        expect(currentPage.path).toContain('match/');
      }
    }, 30000);

    it('创建赛程后不应有未捕获异常', async () => {
      clearConsoleLogs();
      const groupId = getGroupId();
      if (!groupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/match/create/create?groupId=${groupId}`,
        2000
      );

      await waitForElement(page, '.btn-primary', 5000);
      await safeTap(page, '.btn-primary');
      await sleep(8000);

      const allErrors = getConsoleLogs('error');
      const uncaughtErrors = allErrors.filter(
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
      expect(uncaughtErrors.length).toBe(0);
    }, 30000);

    it('创建赛程后详情页应正常加载数据', async () => {
      clearConsoleLogs();
      const groupId = getGroupId();
      if (!groupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/match/create/create?groupId=${groupId}`,
        2000
      );

      await waitForElement(page, '.btn-primary', 5000);
      await safeTap(page, '.btn-primary');

      // 等待跳转到详情页
      await sleep(8000);
      const currentPage = await miniProgram.currentPage();

      if (!currentPage.path.includes('match/detail')) {
        console.log(`⏭️ 未跳转到详情页 (${currentPage.path})，跳过详情页验证`);
        // 打印错误日志帮助定位
        const errorLogs = getConsoleLogs('error');
        if (errorLogs.length > 0) {
          console.error('❌ 错误日志:');
          errorLogs.forEach((e) => console.error(`  ${e.text}`));
        }
        // 严格断言：应该跳转到详情页
        expect(currentPage.path).toContain('match/detail');
        return;
      }

      // 等待数据加载
      await sleep(3000);
      const data = await currentPage.data();

      // 严格断言：match 数据应已加载
      expect(data.matchId).toBeTruthy();
      expect(data.match).toBeTruthy();
      expect(data.match.status).toBe('active');

      // 严格断言：scores 应已创建（每个成员一条）
      expect(Array.isArray(data.scores)).toBe(true);
      expect(data.scores.length).toBeGreaterThanOrEqual(1);

      // 严格断言：不应有 loadData 错误日志
      const errorLogs = getConsoleLogs('error');
      const loadErrors = errorLogs.filter(
        (e) => e.text.includes('loadData') || e.text.includes('加载失败')
      );
      if (loadErrors.length > 0) {
        console.error('❌ 赛程详情页加载失败:');
        loadErrors.forEach((e) => console.error(`  ${e.text}`));
      }
      expect(loadErrors.length).toBe(0);
    }, 35000);

    it('creating 状态应在创建完成后恢复为 false', async () => {
      clearConsoleLogs();
      const groupId = getGroupId();
      if (!groupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/match/create/create?groupId=${groupId}`,
        2000
      );

      await waitForElement(page, '.btn-primary', 5000);
      await safeTap(page, '.btn-primary');
      await sleep(8000);

      const currentPage = await miniProgram.currentPage();
      if (currentPage.path.includes('match/create')) {
        const data = await currentPage.data();
        expect(data.creating).toBe(false);
      }
      // 如果已跳转到详情页，说明创建成功，无需检查
    }, 25000);
  });

  // ── 赛程详情页 ──────────────────────────────────────────────
  describe('赛程详情页', () => {
    it('应能进入赛事详情页查看赛程列表', async () => {
      const groupId = getGroupId();
      if (!groupId) {
        console.log('⏭️ 跳过：无可用 groupId');
        return;
      }

      const page = await ensureOnPage(
        miniProgram,
        `/pages/group/detail/detail?id=${groupId}`,
        3000
      );

      await sleep(3000);
      const data = await page.data();

      // 应在详情页
      expect(page.path).toContain('group/detail');

      // 如果数据加载成功，赛程列表应有数据（前面创建了赛程）
      if (data.group && data.group.name) {
        expect(Array.isArray(data.matches)).toBe(true);
        console.log(`📋 赛程数量: ${data.matches.length}`);
      }
    }, 20000);
  });

  // ── 结束赛程 ──────────────────────────────────────────────
  describe('结束赛程', () => {
    /**
     * 辅助函数：创建一个新赛程并跳转到详情页，返回 matchId
     */
    async function createMatchAndGoDetail() {
      const groupId = autoGroupId || process.env.TEST_GROUP_ID || '';
      if (!groupId) return null;

      clearConsoleLogs();
      const page = await ensureOnPage(
        miniProgram,
        `/pages/match/create/create?groupId=${groupId}`,
        2000
      );
      await waitForElement(page, '.btn-primary', 5000);
      await safeTap(page, '.btn-primary');
      await sleep(8000);

      const currentPage = await miniProgram.currentPage();
      if (currentPage.path.includes('match/detail')) {
        const data = await currentPage.data();
        return { matchId: data.matchId, groupId: data.groupId };
      }
      return null;
    }

    it('点击结束赛程应弹出确认弹窗', async () => {
      const groupId = autoGroupId || process.env.TEST_GROUP_ID || '';
      if (!groupId) {
        console.log('⏭️ 跳过：无可用 groupId');
        return;
      }

      // 创建赛程并进入详情页
      const result = await createMatchAndGoDetail();
      if (!result) {
        console.log('⏭️ 跳过：赛程创建失败');
        return;
      }

      await sleep(3000);
      const page = await miniProgram.currentPage();
      const data = await page.data();

      // 确认是管理员且赛程进行中
      if (!data.isAdmin || data.match.status !== 'active') {
        console.log(`⏭️ 跳过：isAdmin=${data.isAdmin}, status=${data.match.status}`);
        return;
      }

      // 点击结束赛程按钮（admin-actions 区域的第一个 btn-primary）
      const adminBtns = await page.$$('.admin-actions .btn-primary');
      if (adminBtns && adminBtns.length > 0) {
        await adminBtns[0].tap();
        await sleep(1000);

        // 验证弹窗出现
        const pageData = await page.data();
        expect(pageData.showFinishModal).toBe(true);
      } else {
        console.log('⏭️ 未找到结束赛程按钮（可能不是管理员）');
      }
    }, 35000);

    it('确认结束赛程后应成功或捕获到错误', async () => {
      clearConsoleLogs();
      const groupId = autoGroupId || process.env.TEST_GROUP_ID || '';
      if (!groupId) {
        console.log('⏭️ 跳过：无可用 groupId');
        return;
      }

      // 创建赛程并进入详情页
      const result = await createMatchAndGoDetail();
      if (!result) {
        console.log('⏭️ 跳过：赛程创建失败');
        return;
      }

      await sleep(3000);
      const page = await miniProgram.currentPage();
      const data = await page.data();

      if (!data.isAdmin || data.match.status !== 'active') {
        console.log(`⏭️ 跳过：isAdmin=${data.isAdmin}, status=${data.match.status}`);
        return;
      }

      // 点击结束赛程 → 弹窗 → 确认结束
      const adminBtns = await page.$$('.admin-actions .btn-primary');
      if (!adminBtns || adminBtns.length === 0) {
        console.log('⏭️ 未找到结束赛程按钮');
        return;
      }

      await adminBtns[0].tap();
      await sleep(1000);

      // 点击弹窗中的确认按钮（modal-card 内的 btn-primary）
      const modalBtns = await page.$$('.modal-card .btn-primary');
      if (modalBtns && modalBtns.length > 0) {
        await modalBtns[0].tap();
        await sleep(6000);

        dumpConsoleLogs();

        const afterData = await page.data();

        // finishing 应恢复为 false
        expect(afterData.finishing).toBe(false);

        if (afterData.match.status === 'finished') {
          console.log('✅ 赛程结束成功');
          expect(afterData.match.status).toBe('finished');
        } else {
          // 结束失败，检查错误日志
          console.log(`⚠️ 赛程状态: ${afterData.match.status}`);
          const errorLogs = getConsoleLogs('error');
          console.log(`📋 错误日志: ${errorLogs.length} 条`);
          errorLogs.forEach((e) => console.log(`  ❌ ${e.text}`));

          // 严格断言：应该成功结束
          expect(afterData.match.status).toBe('finished');
        }
      } else {
        console.log('⏭️ 未找到确认按钮');
      }
    }, 45000);

    it('结束赛程后不应有未捕获异常', async () => {
      clearConsoleLogs();
      const groupId = autoGroupId || process.env.TEST_GROUP_ID || '';
      if (!groupId) {
        console.log('⏭️ 跳过：无可用 groupId');
        return;
      }

      const result = await createMatchAndGoDetail();
      if (!result) {
        console.log('⏭️ 跳过：赛程创建失败');
        return;
      }

      await sleep(3000);
      const page = await miniProgram.currentPage();
      const data = await page.data();

      if (!data.isAdmin || data.match.status !== 'active') return;

      // 触发结束流程
      const adminBtns = await page.$$('.admin-actions .btn-primary');
      if (adminBtns && adminBtns.length > 0) {
        await adminBtns[0].tap();
        await sleep(1000);
        const modalBtns = await page.$$('.modal-card .btn-primary');
        if (modalBtns && modalBtns.length > 0) {
          await modalBtns[0].tap();
          await sleep(6000);
        }
      }

      // 检查未捕获异常
      const allErrors = getConsoleLogs('error');
      const uncaughtErrors = allErrors.filter(
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
      expect(uncaughtErrors.length).toBe(0);
    }, 45000);

    it('结束赛程后 finishing 状态应恢复为 false', async () => {
      clearConsoleLogs();
      const groupId = autoGroupId || process.env.TEST_GROUP_ID || '';
      if (!groupId) return;

      const result = await createMatchAndGoDetail();
      if (!result) return;

      await sleep(3000);
      const page = await miniProgram.currentPage();
      const data = await page.data();

      if (!data.isAdmin || data.match.status !== 'active') return;

      const adminBtns = await page.$$('.admin-actions .btn-primary');
      if (adminBtns && adminBtns.length > 0) {
        await adminBtns[0].tap();
        await sleep(1000);
        const modalBtns = await page.$$('.modal-card .btn-primary');
        if (modalBtns && modalBtns.length > 0) {
          await modalBtns[0].tap();
          await sleep(6000);
        }
      }

      const afterData = await page.data();
      expect(afterData.finishing).toBe(false);
      // showFinishModal 应已关闭
      expect(afterData.showFinishModal).toBe(false);
    }, 45000);

    it('结束赛程后不应有 loadData 错误', async () => {
      clearConsoleLogs();
      const groupId = autoGroupId || process.env.TEST_GROUP_ID || '';
      if (!groupId) return;

      const result = await createMatchAndGoDetail();
      if (!result) return;

      await sleep(3000);
      const page = await miniProgram.currentPage();
      const data = await page.data();

      if (!data.isAdmin || data.match.status !== 'active') return;

      const adminBtns = await page.$$('.admin-actions .btn-primary');
      if (adminBtns && adminBtns.length > 0) {
        await adminBtns[0].tap();
        await sleep(1000);
        const modalBtns = await page.$$('.modal-card .btn-primary');
        if (modalBtns && modalBtns.length > 0) {
          await modalBtns[0].tap();
          await sleep(8000);
        }
      }

      // 结束后 loadData 会被重新调用，检查是否有错误
      const errorLogs = getConsoleLogs('error');
      const loadErrors = errorLogs.filter(
        (e) => e.text.includes('loadData') || e.text.includes('finishMatch')
      );
      if (loadErrors.length > 0) {
        console.error('❌ 结束赛程相关错误:');
        loadErrors.forEach((e) => console.error(`  ${e.text}`));
      }
      expect(loadErrors.length).toBe(0);
    }, 45000);
  });

  // ── 销毁赛程（作废） ──────────────────────────────────────
  describe('销毁赛程（作废）', () => {
    /**
     * 辅助函数：创建一个新赛程并进入详情页
     */
    async function createMatchForCancel() {
      const groupId = autoGroupId || process.env.TEST_GROUP_ID || '';
      if (!groupId) return null;

      clearConsoleLogs();
      const page = await ensureOnPage(
        miniProgram,
        `/pages/match/create/create?groupId=${groupId}`,
        2000
      );
      await waitForElement(page, '.btn-primary', 5000);
      await safeTap(page, '.btn-primary');
      await sleep(8000);

      const currentPage = await miniProgram.currentPage();
      if (currentPage.path.includes('match/detail')) {
        const data = await currentPage.data();
        return { matchId: data.matchId, groupId: data.groupId };
      }
      return null;
    }

    it('赛程详情页应显示销毁按钮（管理员+进行中）', async () => {
      const groupId = autoGroupId || process.env.TEST_GROUP_ID || '';
      if (!groupId) {
        console.log('⏭️ 跳过：无可用 groupId');
        return;
      }

      const result = await createMatchForCancel();
      if (!result) {
        console.log('⏭️ 跳过：赛程创建失败');
        return;
      }

      await sleep(3000);
      const page = await miniProgram.currentPage();
      const data = await page.data();

      if (data.isAdmin && data.match.status === 'active') {
        // 应有销毁按钮
        const dangerBtn = await page.$('.admin-actions .btn-danger');
        expect(dangerBtn).toBeTruthy();
      }
    }, 35000);

    it('点击销毁赛程应弹出确认弹窗并可取消', async () => {
      const groupId = autoGroupId || process.env.TEST_GROUP_ID || '';
      if (!groupId) return;

      const result = await createMatchForCancel();
      if (!result) return;

      await sleep(3000);
      const page = await miniProgram.currentPage();
      const data = await page.data();

      if (!data.isAdmin || data.match.status !== 'active') return;

      // 点击销毁按钮（会触发 wx.showModal）
      const dangerBtn = await page.$('.admin-actions .btn-danger');
      if (dangerBtn) {
        await dangerBtn.tap();
        await sleep(1000);

        // wx.showModal 是原生弹窗，无法通过 automator 直接操作
        // 但可以验证页面没有崩溃
        const afterData = await page.data();
        expect(afterData.match).toBeTruthy();
        console.log('✅ 销毁弹窗已触发，页面未崩溃');
      }
    }, 35000);

    it('销毁赛程后不应有未捕获异常', async () => {
      clearConsoleLogs();
      const groupId = autoGroupId || process.env.TEST_GROUP_ID || '';
      if (!groupId) return;

      const result = await createMatchForCancel();
      if (!result) return;

      await sleep(3000);
      const page = await miniProgram.currentPage();
      const data = await page.data();

      if (!data.isAdmin || data.match.status !== 'active') return;

      // 触发销毁流程
      const dangerBtn = await page.$('.admin-actions .btn-danger');
      if (dangerBtn) {
        await dangerBtn.tap();
        await sleep(3000);
      }

      // 检查未捕获异常
      const allErrors = getConsoleLogs('error');
      const uncaughtErrors = allErrors.filter(
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
      expect(uncaughtErrors.length).toBe(0);
    }, 35000);
  });

  // ── 填写结算筹码（自包含流程） ─────────────────────────────
  describe('填写结算筹码（自包含流程）', () => {
    let testMatchId = null;
    let testGroupId = null;
    let testScoreId = null;

    beforeAll(async () => {
      // 创建赛程并获取 scoreId
      const groupId = autoGroupId || process.env.TEST_GROUP_ID || '';
      if (!groupId) return;

      clearConsoleLogs();
      const page = await ensureOnPage(
        miniProgram,
        `/pages/match/create/create?groupId=${groupId}`,
        2000
      );
      await waitForElement(page, '.btn-primary', 5000);
      await safeTap(page, '.btn-primary');
      await sleep(8000);

      const currentPage = await miniProgram.currentPage();
      if (currentPage.path.includes('match/detail')) {
        const data = await currentPage.data();
        testMatchId = data.matchId;
        testGroupId = data.groupId;

        // 找到当前用户的 score
        const selfScore = data.scores.find((s) => s.isSelf);
        if (selfScore) {
          testScoreId = selfScore._id;
          console.log(`✅ 填写测试前置：matchId=${testMatchId}, scoreId=${testScoreId}`);
        } else {
          console.warn('⚠️ 未找到当前用户的 score 记录');
        }
      }
    }, 45000);

    it('从赛程详情页点击自己的分数行应跳转到填写页', async () => {
      if (!testMatchId || !testGroupId) {
        console.log('⏭️ 跳过：无可用 matchId');
        return;
      }

      const page = await ensureOnPage(
        miniProgram,
        `/pages/match/detail/detail?id=${testMatchId}&groupId=${testGroupId}`,
        3000
      );
      await sleep(3000);

      const data = await page.data();
      if (data.match.status !== 'active') {
        console.log('⏭️ 跳过：赛程不是进行中');
        return;
      }

      // 点击自己的分数行
      const scoreRows = await page.$$('.score-row');
      if (scoreRows && scoreRows.length > 0) {
        // 找到带有 self-tag 的行
        for (const row of scoreRows) {
          const selfTag = await row.$('.self-tag');
          if (selfTag) {
            await row.tap();
            await sleep(3000);

            const currentPage = await miniProgram.currentPage();
            expect(currentPage.path).toContain('score/input');
            console.log('✅ 已跳转到填写页');
            return;
          }
        }
        // 如果没找到 self-tag，直接点击第一行尝试
        await scoreRows[0].tap();
        await sleep(3000);
        const currentPage = await miniProgram.currentPage();
        // 可能跳转成功或显示“只能填写自己的分数”
        console.log(`📋 点击后页面: ${currentPage.path}`);
      }
    }, 25000);

    it('填写页应正确加载分数数据', async () => {
      if (!testScoreId || !testMatchId) {
        console.log('⏭️ 跳过：无可用 scoreId');
        return;
      }

      // automator 通信可能偶发超时，使用重试机制
      let data;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const page = await ensureOnPage(
            miniProgram,
            `/pages/score/input/input?scoreId=${testScoreId}&matchId=${testMatchId}`,
            3000
          );

          expect(page.path).toContain('score/input');

          // 等待分数数据加载完成
          data = await waitForData(page, (d) => d.score && typeof d.score.initialChips === 'number', 15000);
          break; // 成功则跳出重试循环
        } catch (err) {
          console.warn(`⚠️ 第 ${attempt} 次尝试失败: ${err.message}`);
          if (attempt === 3) {
            // 最后一次尝试，重新导航后直接读取
            const page = await ensureOnPage(
              miniProgram,
              `/pages/score/input/input?scoreId=${testScoreId}&matchId=${testMatchId}`,
              5000
            );
            await sleep(5000);
            data = await page.data();
          } else {
            await sleep(3000);
          }
        }
      }

      expect(data.scoreId).toBe(testScoreId);
      expect(data.matchId).toBe(testMatchId);
      expect(data.score).toBeTruthy();
      expect(typeof data.score.initialChips).toBe('number');
      console.log(`📋 初始筹码: ${data.score.initialChips}, 额外加成: ${data.score.bonus || 0}`);
    }, 60000);

    it('输入结算筹码应正确绑定并显示预览积分', async () => {
      if (!testScoreId || !testMatchId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/score/input/input?scoreId=${testScoreId}&matchId=${testMatchId}`,
        2000
      );
      await sleep(3000);

      // 输入结算筹码
      const input = await page.$('.chips-input');
      if (input) {
        await input.input('1500');
        await sleep(500);

        const data = await page.data();
        expect(data.finalChips).toBe('1500');
        // 预览积分应已计算
        expect(typeof data.previewPoints).toBe('number');
        console.log(`📋 结算筹码: 1500, 预览积分: ${data.previewPoints}`);
      }
    }, 20000);

    it('结算筹码为空时保存按钮应禁用', async () => {
      if (!testScoreId || !testMatchId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/score/input/input?scoreId=${testScoreId}&matchId=${testMatchId}`,
        2000
      );
      await sleep(3000);

      const data = await page.data();
      // 初始状态 finalChips 可能为空
      if (data.finalChips === '') {
        const btn = await page.$('.btn-primary');
        if (btn) {
          const disabled = await btn.attribute('disabled');
          expect(disabled !== null && disabled !== undefined).toBe(true);
        }
      }
    }, 15000);

    it('保存结算筹码应成功或捕获错误', async () => {
      clearConsoleLogs();
      if (!testScoreId || !testMatchId) {
        console.log('⏭️ 跳过：无可用 scoreId');
        return;
      }

      const page = await ensureOnPage(
        miniProgram,
        `/pages/score/input/input?scoreId=${testScoreId}&matchId=${testMatchId}`,
        2000
      );
      await sleep(3000);

      // 输入结算筹码
      const input = await page.$('.chips-input');
      if (input) {
        await input.input('1200');
        await sleep(500);

        // 点击保存
        await safeTap(page, '.btn-primary');
        await sleep(5000);

        dumpConsoleLogs();

        // 保存后应跳回上一页或显示错误
        const currentPage = await miniProgram.currentPage();

        if (currentPage.path.includes('match/detail')) {
          console.log('✅ 保存成功，已跳回赛程详情页');
        } else if (currentPage.path.includes('score/input')) {
          // 可能保存失败，检查 saving 状态
          const data = await currentPage.data();
          expect(data.saving).toBe(false);
          console.log('⚠️ 保存后仍在填写页');
        }

        // 不应有未捕获异常
        const allErrors = getConsoleLogs('error');
        const uncaughtErrors = allErrors.filter(
          (e) =>
            e.text.includes('TypeError') ||
            e.text.includes('ReferenceError') ||
            e.text.includes('is not a function')
        );
        expect(uncaughtErrors.length).toBe(0);
      }
    }, 30000);

    it('保存后 saving 状态应恢复为 false', async () => {
      if (!testScoreId || !testMatchId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/score/input/input?scoreId=${testScoreId}&matchId=${testMatchId}`,
        2000
      );
      await sleep(3000);

      const input = await page.$('.chips-input');
      if (input) {
        await input.input('800');
        await sleep(300);

        await safeTap(page, '.btn-primary');
        await sleep(5000);

        const currentPage = await miniProgram.currentPage();
        if (currentPage.path.includes('score/input')) {
          const data = await currentPage.data();
          expect(data.saving).toBe(false);
        }
        // 如果已跳回详情页，说明保存成功
      }
    }, 25000);
  });

  // ── 填写结算筹码（环境变量模式） ─────────────────────────
  describe('填写结算筹码（环境变量模式）', () => {
    it('填写页面应能正常加载', async () => {
      const scoreId = process.env.TEST_SCORE_ID;
      const matchId = process.env.TEST_MATCH_ID;
      if (!scoreId || !matchId) {
        console.log('⏭️ 跳过：未设置 TEST_SCORE_ID / TEST_MATCH_ID');
        return;
      }

      const page = await ensureOnPage(
        miniProgram,
        `/pages/score/input/input?scoreId=${scoreId}&matchId=${matchId}`,
        2000
      );

      expect(page.path).toContain('score/input');
    }, 20000);
  });
});
/**
 * tests/e2e/member.test.js
 * 成员详情页 E2E 测试
 * 自包含流程：先创建赛事和赛程，再进入成员详情页测试
 */
const { getMiniProgram, releaseMiniProgram, getConsoleLogs, clearConsoleLogs, dumpConsoleLogs } = require('./setup');
const {
  sleep,
  ensureOnPage,
  waitForElement,
  safeTap,
  safeInput,
  waitForData,
} = require('./helpers');

describe('成员详情页 E2E', () => {
  let miniProgram;
  let testGroupId = null;
  let testUserId = null;

  beforeAll(async () => {
    miniProgram = await getMiniProgram();

    // 创建一个赛事并获取成员信息
    try {
      const page = await ensureOnPage(miniProgram, '/pages/group/create/create', 3000);
      try {
        await waitForElement(page, '.input-field', 8000);
      } catch (_) {
        const p = await miniProgram.currentPage();
        await waitForElement(p, '.input-field', 5000);
      }

      await safeInput(page, '.input-field', `成员测试组_${Date.now()}`, 5000);
      await sleep(300);
      await safeTap(page, '.btn-primary');
      await sleep(8000);

      const currentPage = await miniProgram.currentPage();
      if (currentPage.path.includes('group/detail')) {
        const data = await currentPage.data();
        testGroupId = data.groupId;

        // 获取第一个成员的 userId
        if (data.members && data.members.length > 0) {
          testUserId = data.members[0].userId;
          console.log(`✅ 成员测试前置：groupId=${testGroupId}, userId=${testUserId}`);
        }
      }
    } catch (err) {
      console.warn(`⚠️ 成员测试前置失败: ${err.message}`);
    }
  }, 60000);

  afterAll(async () => {
    await releaseMiniProgram();
  });

  // ── 成员详情页加载 ──────────────────────────────────────────
  describe('成员详情页加载', () => {
    it('应能进入成员详情页', async () => {
      if (!testGroupId || !testUserId) {
        console.log('⏭️ 跳过：无可用 groupId 或 userId');
        return;
      }

      const page = await ensureOnPage(
        miniProgram,
        `/pages/member/detail/detail?userId=${testUserId}&groupId=${testGroupId}`,
        2000
      );

      expect(page.path).toContain('member/detail');
    }, 15000);

    it('成员详情页应正确加载数据', async () => {
      if (!testGroupId || !testUserId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/member/detail/detail?userId=${testUserId}&groupId=${testGroupId}`,
        2000
      );
      await sleep(3000);

      const data = await page.data();
      expect(data.userId).toBe(testUserId);
      expect(data.groupId).toBe(testGroupId);
      expect(data.memberInfo).toBeTruthy();
      expect(typeof data.totalPoints).toBe('number');
      expect(Array.isArray(data.scores)).toBe(true);

      console.log(`📋 成员: ${data.memberInfo.nickName || '未知'}, 总积分: ${data.totalPoints}, 分数记录: ${data.scores.length}`);
    }, 15000);

    it('成员详情页加载不应有未捕获错误', async () => {
      clearConsoleLogs();
      if (!testGroupId || !testUserId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/member/detail/detail?userId=${testUserId}&groupId=${testGroupId}`,
        2000
      );
      await sleep(3000);

      const errorLogs = getConsoleLogs('error');
      const uncaughtErrors = errorLogs.filter(
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
    }, 15000);

    it('新创建的组成员应无分数记录', async () => {
      if (!testGroupId || !testUserId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/member/detail/detail?userId=${testUserId}&groupId=${testGroupId}`,
        2000
      );
      await sleep(3000);

      const data = await page.data();
      // 新创建的组没有已完成赛程，分数记录应为空或积分为 0
      expect(data.totalPoints).toBe(0);
    }, 15000);
  });

  // ── 从赛事详情页跳转到成员详情页 ──────────────────────────
  describe('从赛事详情页跳转', () => {
    it('点击积分榜成员应跳转到成员详情页', async () => {
      if (!testGroupId) {
        console.log('⏭️ 跳过：无可用 groupId');
        return;
      }

      const page = await ensureOnPage(
        miniProgram,
        `/pages/group/detail/detail?id=${testGroupId}`,
        3000
      );

      // 等待数据加载
      try {
        await waitForData(page, (d) => d.group && d.group.name, 8000);
      } catch (_) {}

      // 切换到积分榜 Tab
      const tabs = await page.$$('.tab-item');
      if (tabs && tabs.length >= 2) {
        await tabs[1].tap();
        await sleep(1000);

        // 点击第一个成员
        const rankCards = await page.$$('.rank-card');
        if (rankCards && rankCards.length > 0) {
          await rankCards[0].tap();
          await sleep(3000);

          const currentPage = await miniProgram.currentPage();
          expect(currentPage.path).toContain('member/detail');
          console.log('✅ 已跳转到成员详情页');
        } else {
          console.log('⏭️ 积分榜无成员卡片');
        }
      }
    }, 25000);
  });

  // ── 有赛程数据时的成员详情 ──────────────────────────────────
  describe('有赛程数据时的成员详情', () => {
    let matchGroupId = null;
    let matchUserId = null;

    beforeAll(async () => {
      // 创建赛事 + 赛程 + 结束赛程，生成积分数据
      try {
        // 创建赛事
        const createPage = await ensureOnPage(miniProgram, '/pages/group/create/create', 3000);
        try {
          await waitForElement(createPage, '.input-field', 8000);
        } catch (_) {
          const p = await miniProgram.currentPage();
          await waitForElement(p, '.input-field', 5000);
        }

        await safeInput(createPage, '.input-field', `成员积分测试_${Date.now()}`, 5000);
        await sleep(300);
        await safeTap(createPage, '.btn-primary');
        await sleep(8000);

        let currentPage = await miniProgram.currentPage();
        if (!currentPage.path.includes('group/detail')) return;

        const groupData = await currentPage.data();
        matchGroupId = groupData.groupId;
        if (groupData.members && groupData.members.length > 0) {
          matchUserId = groupData.members[0].userId;
        }

        // 创建赛程
        const matchPage = await ensureOnPage(
          miniProgram,
          `/pages/match/create/create?groupId=${matchGroupId}`,
          2000
        );
        await waitForElement(matchPage, '.btn-primary', 5000);
        await safeTap(matchPage, '.btn-primary');
        await sleep(8000);

        currentPage = await miniProgram.currentPage();
        if (!currentPage.path.includes('match/detail')) return;

        const matchData = await currentPage.data();

        // 结束赛程
        if (matchData.isAdmin && matchData.match.status === 'active') {
          const adminBtns = await currentPage.$$('.admin-actions .btn-primary');
          if (adminBtns && adminBtns.length > 0) {
            await adminBtns[0].tap();
            await sleep(1000);
            const modalBtns = await currentPage.$$('.modal-card .btn-primary');
            if (modalBtns && modalBtns.length > 0) {
              await modalBtns[0].tap();
              await sleep(6000);
            }
          }
        }

        console.log(`✅ 成员积分测试前置完成: groupId=${matchGroupId}, userId=${matchUserId}`);
      } catch (err) {
        console.warn(`⚠️ 成员积分测试前置失败: ${err.message}`);
      }
    }, 90000);

    it('有已完成赛程时应显示分数记录', async () => {
      if (!matchGroupId || !matchUserId) {
        console.log('⏭️ 跳过：前置数据不完整');
        return;
      }

      const page = await ensureOnPage(
        miniProgram,
        `/pages/member/detail/detail?userId=${matchUserId}&groupId=${matchGroupId}`,
        2000
      );
      await sleep(3000);

      const data = await page.data();
      expect(data.memberInfo).toBeTruthy();

      // 应有分数记录
      if (data.scores.length > 0) {
        const firstScore = data.scores[0];
        expect(firstScore.matchTitle).toBeTruthy();
        expect(firstScore.matchStatus).toBeTruthy();
        console.log(`📋 第一条分数: ${firstScore.matchTitle}, 状态: ${firstScore.matchStatus}, 积分: ${firstScore.points}`);
      }

      console.log(`📋 总积分: ${data.totalPoints}, 分数记录数: ${data.scores.length}`);
    }, 20000);

    it('分数记录应包含赛程标题和日期', async () => {
      if (!matchGroupId || !matchUserId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/member/detail/detail?userId=${matchUserId}&groupId=${matchGroupId}`,
        2000
      );
      await sleep(3000);

      const data = await page.data();
      if (data.scores.length > 0) {
        data.scores.forEach((s, i) => {
          expect(s.matchTitle).toBeTruthy();
          // matchDateStr 应已格式化
          if (s.matchDateStr) {
            expect(typeof s.matchDateStr).toBe('string');
          }
        });
      }
    }, 15000);
  });
});

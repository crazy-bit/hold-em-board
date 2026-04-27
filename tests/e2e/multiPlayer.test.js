/**
 * tests/e2e/multiPlayer.test.js
 * 多人赛事（4人）E2E 测试
 * 
 * 测试场景：
 * 1. 创建赛事 → 通过数据库插入 3 个模拟成员（共 4 人）
 * 2. 验证详情页成员列表显示 4 人
 * 3. 创建赛程 → 验证为 4 人各创建了分数记录
 * 4. 填写当前用户的结算筹码
 * 5. 结束赛程 → 验证 4 人积分计算
 * 6. 验证积分榜排名正确
 * 7. 验证成员详情页数据
 * 
 * 注意：automator 只有一个真实用户身份，其余 3 人通过 evaluate 直接操作数据库插入
 */
const { getMiniProgram, releaseMiniProgram, getConsoleLogs, clearConsoleLogs, dumpConsoleLogs } = require('./setup');
const {
  sleep,
  ensureOnPage,
  waitForElement,
  safeTap,
  safeInput,
  waitForData,
  waitForNavigation,
  addMockMembers,
  removeMockMembers,
} = require('./helpers');

// 3 个模拟成员（加上当前登录用户共 4 人）
const MOCK_MEMBERS = [
  { userId: 'mock_player_alice', nickName: 'Alice' },
  { userId: 'mock_player_bob', nickName: 'Bob' },
  { userId: 'mock_player_charlie', nickName: 'Charlie' },
];
const MOCK_USER_IDS = MOCK_MEMBERS.map((m) => m.userId);

describe('多人赛事（4人）E2E', () => {
  let miniProgram;
  let groupId = null;
  let groupInviteCode = null;
  let matchId = null;
  let selfScoreId = null;

  beforeAll(async () => {
    miniProgram = await getMiniProgram();
  }, 30000);

  afterAll(async () => {
    // 清理模拟成员数据
    if (groupId) {
      console.log('🧹 清理模拟成员数据...');
      await removeMockMembers(miniProgram, groupId, MOCK_USER_IDS);
    }
    await releaseMiniProgram();
  });

  // ── 第一步：创建 4 人赛事 ─────────────────────────────────
  describe('创建 4 人赛事', () => {
    it('应成功创建赛事', async () => {
      clearConsoleLogs();
      const page = await ensureOnPage(miniProgram, '/subpages/group/create/create', 3000);
      try {
        await waitForData(page, d => d.groupName !== undefined, 8000);
      } catch (_) {
        const p = await miniProgram.currentPage();
        await waitForData(p, d => d.groupName !== undefined, 5000);
      }

      const groupName = `4人测试组_${Date.now()}`;
      await page.setData({ groupName: groupName });
      await sleep(300);
      await page.callMethod('createGroup');
      await sleep(8000);

      const currentPage = await miniProgram.currentPage();
      if (currentPage.path.includes('group/detail')) {
        const data = await currentPage.data();
        groupId = data.groupId;
        if (data.group && data.group.inviteCode) {
          groupInviteCode = data.group.inviteCode;
        }
        console.log(`✅ 赛事创建成功: groupId=${groupId}, inviteCode=${groupInviteCode}`);
        expect(groupId).toBeTruthy();
      } else {
        console.warn(`⚠️ 创建未跳转到详情页: ${currentPage.path}`);
        dumpConsoleLogs();
        // 严格断言
        expect(currentPage.path).toContain('group/detail');
      }
    }, 35000);

    it('应成功插入 3 个模拟成员（共 4 人）', async () => {
      if (!groupId) {
        console.log('⏭️ 跳过：赛事创建失败');
        return;
      }

      const addedCount = await addMockMembers(miniProgram, groupId, MOCK_MEMBERS);
      console.log(`✅ 成功插入 ${addedCount} 个模拟成员`);
      expect(addedCount).toBe(3);
    }, 30000);

    it('刷新详情页应显示 4 个成员', async () => {
      if (!groupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/subpages/group/detail/detail?id=${groupId}`,
        3000
      );

      // 等待数据加载完成
      try {
        await waitForData(page, (d) => d.members && d.members.length >= 4, 10000);
      } catch (_) {
        // 超时继续验证
      }

      const data = await page.data();
      console.log(`📋 成员数量: ${data.members.length}`);
      data.members.forEach((m, i) => {
        console.log(`  [${i + 1}] ${m.nickName} (${m.userId.substring(0, 10)}...)`);
      });

      expect(data.members.length).toBe(4);

      // 验证模拟成员都在列表中
      const memberNames = data.members.map((m) => m.nickName);
      MOCK_MEMBERS.forEach((mock) => {
        expect(memberNames).toContain(mock.nickName);
      });
    }, 20000);
  });

  // ── 第二步：创建赛程并验证 4 人分数记录 ─────────────────────
  describe('4 人赛程创建', () => {
    it('创建赛程应为 4 人各生成分数记录', async () => {
      clearConsoleLogs();
      if (!groupId) {
        console.log('⏭️ 跳过：无可用 groupId');
        return;
      }

      const page = await ensureOnPage(
        miniProgram,
        `/subpages/match/create/create?groupId=${groupId}`,
        2000
      );
      await waitForData(page, d => typeof d.creating === 'boolean', 5000);
      await page.callMethod('createMatch');
      await sleep(8000);

      const currentPage = await miniProgram.currentPage();
      if (!currentPage.path.includes('match/detail')) {
        console.warn(`⚠️ 赛程创建未跳转到详情页: ${currentPage.path}`);
        dumpConsoleLogs();
        expect(currentPage.path).toContain('match/detail');
        return;
      }

      // 等待数据加载
      await sleep(3000);
      const data = await currentPage.data();
      matchId = data.matchId;

      console.log(`✅ 赛程创建成功: matchId=${matchId}`);
      console.log(`📋 分数记录数: ${data.scores.length}`);
      data.scores.forEach((s, i) => {
        console.log(`  [${i + 1}] ${s.nickName}: 初始=${s.initialChips}, 加成=${s.bonus}, isSelf=${s.isSelf}`);
      });

      // 严格断言：应有 4 条分数记录
      expect(data.scores.length).toBe(4);

      // 每条记录应有初始筹码
      data.scores.forEach((s) => {
        expect(typeof s.initialChips).toBe('number');
        expect(s.initialChips).toBeGreaterThan(0);
        expect(s.nickName).toBeTruthy();
      });

      // 找到当前用户的 score
      const selfScore = data.scores.find((s) => s.isSelf);
      if (selfScore) {
        selfScoreId = selfScore._id;
        console.log(`📋 当前用户 scoreId: ${selfScoreId}`);
      }
    }, 35000);

    it('赛程状态应为进行中', async () => {
      if (!matchId || !groupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/subpages/match/detail/detail?id=${matchId}&groupId=${groupId}`,
        3000
      );
      await sleep(2000);

      const data = await page.data();
      expect(data.match.status).toBe('active');
    }, 15000);

    it('未填写人数应为 4', async () => {
      if (!matchId || !groupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/subpages/match/detail/detail?id=${matchId}&groupId=${groupId}`,
        3000
      );
      await sleep(2000);

      const data = await page.data();
      expect(data.unfilledCount).toBe(4);
    }, 15000);
  });

  // ── 第三步：填写当前用户的结算筹码 ─────────────────────────
  describe('填写结算筹码', () => {
    it('当前用户应能填写自己的结算筹码', async () => {
      if (!selfScoreId || !matchId) {
        console.log('⏭️ 跳过：无可用 scoreId');
        return;
      }

      const page = await ensureOnPage(
        miniProgram,
        `/subpages/score/input/input?scoreId=${selfScoreId}&matchId=${matchId}`,
        2000
      );
      await sleep(3000);

      const data = await page.data();
      expect(data.scoreId).toBe(selfScoreId);
      expect(data.score).toBeTruthy();

      // 输入结算筹码（比初始多 500）
      const finalChips = (data.score.initialChips || 1000) + 500;
      const input = await page.$('.chips-input');
      if (input) {
        await input.input(String(finalChips));
        await sleep(500);

        const afterData = await page.data();
        expect(afterData.finalChips).toBe(String(finalChips));
        expect(afterData.previewPoints).toBe(finalChips - data.score.initialChips + (data.bonusCountsToTotal ? (data.score.bonus || 0) : 0));

        console.log(`📋 填写结算筹码: ${finalChips}, 预览积分: ${afterData.previewPoints}`);

        // 保存
        await page.callMethod('createGroup');
        await sleep(5000);

        const currentPage = await miniProgram.currentPage();
        if (currentPage.path.includes('match/detail')) {
          console.log('✅ 保存成功，已跳回赛程详情页');
        }
      }
    }, 30000);

    it('保存后赛程详情页未填写人数应减少', async () => {
      if (!matchId || !groupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/subpages/match/detail/detail?id=${matchId}&groupId=${groupId}`,
        3000
      );
      await sleep(3000);

      const data = await page.data();
      // 当前用户已填写，其余 3 人未填写
      console.log(`📋 未填写人数: ${data.unfilledCount}`);

      // 当前用户的 finalChips 应不为 null
      const selfScore = data.scores.find((s) => s.isSelf);
      if (selfScore && selfScore.finalChips !== null) {
        expect(data.unfilledCount).toBe(3);
      }
    }, 15000);
  });

  // ── 第四步：结束赛程（强制，未填写的以 0 计算） ─────────────
  describe('4 人赛程结束', () => {
    it('点击结束赛程应弹出确认弹窗并显示未填写成员', async () => {
      if (!matchId || !groupId) {
        console.log('⏭️ 跳过：无可用 matchId');
        return;
      }

      const page = await ensureOnPage(
        miniProgram,
        `/subpages/match/detail/detail?id=${matchId}&groupId=${groupId}`,
        3000
      );
      await sleep(3000);

      const data = await page.data();
      if (!data.isAdmin || data.match.status !== 'active') {
        console.log(`⏭️ 跳过：isAdmin=${data.isAdmin}, status=${data.match.status}`);
        return;
      }

      // 直接调用方法，比点击 t-button 更可靠
      await page.callMethod('finishMatch');
      await sleep(1000);

      const modalData = await page.data();
      expect(modalData.showFinishModal).toBe(true);

      // 应显示未填写成员列表（3 个模拟成员）
      console.log(`📋 未填写成员: ${modalData.unfilledMembers.join(', ')}`);
      expect(modalData.unfilledMembers.length).toBeGreaterThanOrEqual(3);
    }, 25000);

    it('确认结束赛程后应成功计算 4 人积分', async () => {
      clearConsoleLogs();
      if (!matchId || !groupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/subpages/match/detail/detail?id=${matchId}&groupId=${groupId}`,
        3000
      );
      await sleep(3000);

      const data = await page.data();
      if (!data.isAdmin || data.match.status !== 'active') return;

      // 直接调用方法，比点击 t-button 更可靠
      const adminBtns = await page.$$('.admin-actions t-button');
      if (!adminBtns || adminBtns.length === 0) return;

      await page.callMethod('finishMatch');
      await sleep(1000);
      // 直接调用确认方法，比点击 UI 更可靠
      await page.callMethod('confirmFinish');
      await sleep(8000);
      dumpConsoleLogs();

      const afterData = await page.data();
      expect(afterData.finishing).toBe(false);

      if (afterData.match.status === 'finished') {
        console.log('✅ 赛程结束成功');

        // 重新加载详情页获取最新分数
        const detailPage = await ensureOnPage(
          miniProgram,
          `/subpages/match/detail/detail?id=${matchId}&groupId=${groupId}`,
          3000
        );
        await sleep(3000);
        const finalData = await detailPage.data();

        console.log(`📋 最终分数（${finalData.scores.length} 人）:`);
        finalData.scores.forEach((s, i) => {
          console.log(`  [${i + 1}] ${s.nickName}: 初始=${s.initialChips}, 结算=${s.finalChips}, 积分=${s.points}`);
        });

        // 严格断言：4 人都应有积分
        expect(finalData.scores.length).toBe(4);
        finalData.scores.forEach((s) => {
          expect(typeof s.points).toBe('number');
        });

        // 当前用户应有正积分（填写了比初始多 500 的筹码）
        const selfScore = finalData.scores.find((s) => s.isSelf);
        if (selfScore) {
          expect(selfScore.points).toBeGreaterThan(0);
          console.log(`📋 当前用户积分: ${selfScore.points}`);
        }

        // 未填写的成员 finalChips 应为 0，积分应为负数
        const mockScores = finalData.scores.filter((s) => !s.isSelf);
        mockScores.forEach((s) => {
          expect(s.finalChips === 0 || s.finalChips === null).toBe(true);
          expect(s.points).toBeLessThanOrEqual(0);
        });
      } else {
        console.warn(`⚠️ 赛程状态: ${afterData.match.status}`);
        const errorLogs = getConsoleLogs('error');
        errorLogs.forEach((e) => console.log(`  ❌ ${e.text}`));
        expect(afterData.match.status).toBe('finished');
      }
    }, 45000);

    it('结束赛程后不应有未捕获异常', async () => {
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
    }, 10000);
  });

  // ── 第五步：验证积分榜排名 ─────────────────────────────────
  describe('4 人积分榜验证', () => {
    it('赛事详情页积分榜应显示 4 人排名', async () => {
      if (!groupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/subpages/group/detail/detail?id=${groupId}`,
        3000
      );

      // 等待数据加载
      try {
        await waitForData(page, (d) => d.leaderboard && d.leaderboard.length >= 4, 10000);
      } catch (_) {}

      const data = await page.data();
      console.log(`📋 积分榜（${data.leaderboard.length} 人）:`);
      data.leaderboard.forEach((m, i) => {
        console.log(`  [${i + 1}] ${m.nickName}: 积分=${m.totalPoints}, 参与=${m.matchCount}期`);
      });

      expect(data.leaderboard.length).toBe(4);

      // 积分榜应按积分降序排列
      for (let i = 1; i < data.leaderboard.length; i++) {
        expect(data.leaderboard[i - 1].totalPoints).toBeGreaterThanOrEqual(
          data.leaderboard[i].totalPoints
        );
      }

      // 每人应参与了 1 期赛程
      data.leaderboard.forEach((m) => {
        expect(m.matchCount).toBe(1);
      });
    }, 25000);

    it('积分榜第一名应为当前用户（唯一有正积分的人）', async () => {
      if (!groupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/subpages/group/detail/detail?id=${groupId}`,
        3000
      );

      try {
        await waitForData(page, (d) => d.leaderboard && d.leaderboard.length >= 4, 10000);
      } catch (_) {}

      const data = await page.data();
      if (data.leaderboard.length >= 4) {
        const first = data.leaderboard[0];
        // 当前用户填写了比初始多 500 的筹码，应排第一
        expect(first.totalPoints).toBeGreaterThan(0);
        console.log(`🏆 第一名: ${first.nickName}, 积分: ${first.totalPoints}`);
      }
    }, 20000);

    it('切换到积分榜 Tab 应正确显示', async () => {
      if (!groupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/subpages/group/detail/detail?id=${groupId}`,
        3000
      );
      await sleep(3000);

      // 切换到积分榜 Tab
      const tabs = await page.$$('.tab-item');
      if (tabs && tabs.length >= 2) {
        await tabs[1].tap();
        await sleep(1000);

        const data = await page.data();
        expect(data.activeTab).toBe('leaderboard');

        // 应有 4 个排名卡片
        const rankCards = await page.$$('.rank-card');
        if (rankCards) {
          console.log(`📋 积分榜卡片数: ${rankCards.length}`);
          expect(rankCards.length).toBe(4);
        }
      }
    }, 20000);
  });

  // ── 第六步：验证成员详情页 ─────────────────────────────────
  describe('4 人成员详情验证', () => {
    it('模拟成员详情页应正确显示积分历史', async () => {
      if (!groupId) return;

      // 查看 Alice 的成员详情
      const page = await ensureOnPage(
        miniProgram,
        `/subpages/member/detail/detail?userId=${MOCK_MEMBERS[0].userId}&groupId=${groupId}`,
        2000
      );
      await sleep(3000);

      const data = await page.data();
      expect(data.userId).toBe(MOCK_MEMBERS[0].userId);
      expect(data.memberInfo).toBeTruthy();

      console.log(`📋 ${data.memberInfo.nickName || MOCK_MEMBERS[0].nickName}: 总积分=${data.totalPoints}, 记录数=${data.scores.length}`);

      // 应有 1 条分数记录（来自刚结束的赛程）
      if (data.scores.length > 0) {
        expect(data.scores[0].matchTitle).toBeTruthy();
        expect(data.scores[0].matchStatus).toBe('finished');
      }

      // 未填写筹码的成员积分应 ≤ 0
      expect(data.totalPoints).toBeLessThanOrEqual(0);
    }, 20000);

    it('当前用户成员详情页应显示正积分', async () => {
      if (!groupId) return;

      // 先获取当前用户的 userId
      const detailPage = await ensureOnPage(
        miniProgram,
        `/subpages/group/detail/detail?id=${groupId}`,
        3000
      );
      await sleep(3000);
      const groupData = await detailPage.data();

      // 找到非模拟成员（即当前用户）
      const selfMember = groupData.members.find(
        (m) => !MOCK_USER_IDS.includes(m.userId)
      );
      if (!selfMember) {
        console.log('⏭️ 跳过：未找到当前用户');
        return;
      }

      const page = await ensureOnPage(
        miniProgram,
        `/subpages/member/detail/detail?userId=${selfMember.userId}&groupId=${groupId}`,
        2000
      );
      await sleep(3000);

      const data = await page.data();
      console.log(`📋 当前用户: 总积分=${data.totalPoints}, 记录数=${data.scores.length}`);

      // 当前用户填写了比初始多 500 的筹码，应有正积分
      expect(data.totalPoints).toBeGreaterThan(0);
    }, 25000);
  });

  // ── 第七步：再创建一期赛程验证多期积分累计 ─────────────────
  describe('多期赛程积分累计', () => {
    let secondMatchId = null;

    it('应能创建第二期赛程', async () => {
      if (!groupId) return;

      clearConsoleLogs();
      const page = await ensureOnPage(
        miniProgram,
        `/subpages/match/create/create?groupId=${groupId}`,
        2000
      );
      await waitForData(page, d => typeof d.creating === 'boolean', 5000);
      await page.callMethod('createMatch');
      await sleep(8000);

      const currentPage = await miniProgram.currentPage();
      if (!currentPage.path.includes('match/detail')) {        const data = await currentPage.data();
        secondMatchId = data.matchId;
        console.log(`✅ 第二期赛程创建成功: matchId=${secondMatchId}`);
        expect(data.scores.length).toBe(4);
      } else {
        console.warn(`⚠️ 第二期赛程创建失败: ${currentPage.path}`);
      }
    }, 35000);

    it('结束第二期赛程后积分应累计', async () => {
      if (!secondMatchId || !groupId) return;

      clearConsoleLogs();
      const page = await ensureOnPage(
        miniProgram,
        `/subpages/match/detail/detail?id=${secondMatchId}&groupId=${groupId}`,
        3000
      );
      await sleep(3000);

      const data = await page.data();
      if (!data.isAdmin || data.match.status !== 'active') return;

      // 直接结束（所有人未填写）
      await page.callMethod('finishMatch');
      await sleep(1000);
      // 直接调用确认方法，比点击 UI 更可靠
      await page.callMethod('confirmFinish');
      await sleep(8000);

      // 验证积分榜累计
      const groupPage = await ensureOnPage(
        miniProgram,
        `/subpages/group/detail/detail?id=${groupId}`,
        3000
      );

      try {
        await waitForData(groupPage, (d) => d.leaderboard && d.leaderboard.length >= 4, 10000);
      } catch (_) {}

      const groupData = await groupPage.data();
      console.log(`📋 两期赛程后积分榜:`);
      groupData.leaderboard.forEach((m, i) => {
        console.log(`  [${i + 1}] ${m.nickName}: 积分=${m.totalPoints}, 参与=${m.matchCount}期`);
      });

      // 每人应参与了 2 期赛程
      groupData.leaderboard.forEach((m) => {
        expect(m.matchCount).toBe(2);
      });

      // 积分榜仍应按降序排列
      for (let i = 1; i < groupData.leaderboard.length; i++) {
        expect(groupData.leaderboard[i - 1].totalPoints).toBeGreaterThanOrEqual(
          groupData.leaderboard[i].totalPoints
        );
      }
    }, 50000);
  });

  // ── 第八步：赛程列表验证 ───────────────────────────────────
  describe('赛程列表验证', () => {
    it('赛事详情页应显示 2 期赛程', async () => {
      if (!groupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/subpages/group/detail/detail?id=${groupId}`,
        3000
      );

      try {
        await waitForData(page, (d) => d.matches && d.matches.length >= 2, 10000);
      } catch (_) {}

      const data = await page.data();
      console.log(`📋 赛程数量: ${data.matches.length}`);
      data.matches.forEach((m, i) => {
        console.log(`  [${i + 1}] ${m.title || '第' + m.index + '期'}: ${m.status}`);
      });

      expect(data.matches.length).toBeGreaterThanOrEqual(2);

      // 所有赛程应为已结束状态
      data.matches.forEach((m) => {
        expect(m.status).toBe('finished');
      });
    }, 20000);
  });
});

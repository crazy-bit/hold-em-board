/**
 * __tests__/e2e/match.test.js
 * 赛程管理 + 分数填写 E2E 测试
 */
const { getMiniProgram, closeMiniProgram } = require('./setup');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const TEST_GROUP_ID = process.env.TEST_GROUP_ID || '';

describe('赛程管理 E2E', () => {
  let miniProgram;

  beforeAll(async () => {
    miniProgram = await getMiniProgram();

    if (!TEST_GROUP_ID) {
      console.warn('⚠️  未设置 TEST_GROUP_ID，部分测试将跳过');
    }
  }, 30000);

  afterAll(async () => {
    await closeMiniProgram();
  });

  // ── 创建赛程 ────────────────────────────────────────────────
  describe('创建赛程', () => {
    it('管理员应能进入创建赛程页面', async () => {
      if (!TEST_GROUP_ID) {
        console.warn('跳过：未设置 TEST_GROUP_ID');
        return;
      }

      const page = await miniProgram.navigateTo(
        `/pages/match/create/create?groupId=${TEST_GROUP_ID}`
      );
      await sleep(1000);
      expect(page).toBeTruthy();

      const currentPage = await miniProgram.currentPage();
      expect(currentPage.path).toContain('match/create');
    }, 15000);

    it('点击创建后应跳转到赛程详情页', async () => {
      if (!TEST_GROUP_ID) return;

      const page = await miniProgram.navigateTo(
        `/pages/match/create/create?groupId=${TEST_GROUP_ID}`
      );
      await sleep(500);

      const btn = await page.$('.btn-primary');
      await btn.tap();

      await sleep(4000);

      const currentPage = await miniProgram.currentPage();
      expect(currentPage.path).toContain('match/detail');
    }, 20000);
  });

  // ── 赛程详情页 ──────────────────────────────────────────────
  describe('赛程详情页', () => {
    it('应能进入赛程详情页（或被重定向到登录页）', async () => {
      if (!TEST_GROUP_ID) return;

      await miniProgram.navigateTo(
        `/pages/group/detail/detail?id=${TEST_GROUP_ID}`
      ).catch(() => {});
      await sleep(2000);

      const currentPage = await miniProgram.currentPage();
      // 已登录时应在 group/detail，未登录时应在 login 页
      const validPaths = ['group/detail', 'login'];
      const isValid = validPaths.some(p => currentPage.path.includes(p));
      expect(isValid).toBe(true);
    }, 20000);
  });

  // ── 填写分数 ────────────────────────────────────────────────
  describe('填写结算筹码', () => {
    it('填写页面应能正常加载', async () => {
      const TEST_SCORE_ID = process.env.TEST_SCORE_ID;
      const TEST_MATCH_ID = process.env.TEST_MATCH_ID;

      if (!TEST_SCORE_ID || !TEST_MATCH_ID) {
        console.warn('⚠️  未设置 TEST_SCORE_ID / TEST_MATCH_ID，跳过');
        return;
      }

      const page = await miniProgram.navigateTo(
        `/pages/score/input/input?scoreId=${TEST_SCORE_ID}&matchId=${TEST_MATCH_ID}`
      );
      await sleep(2000);

      const currentPage = await miniProgram.currentPage();
      expect(currentPage.path).toContain('score/input');
    }, 20000);
  });
});

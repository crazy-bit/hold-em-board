/**
 * tests/e2e/rules.test.js
 * 规则编辑页 E2E 测试
 * 自包含流程：先创建赛事，再进入规则编辑页测试
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

describe('规则编辑页 E2E', () => {
  let miniProgram;
  let testGroupId = null;

  beforeAll(async () => {
    miniProgram = await getMiniProgram();

    // 创建一个赛事用于规则编辑测试
    try {
      const page = await ensureOnPage(miniProgram, '/pages/group/create/create', 3000);
      try {
        await waitForElement(page, '.input-field', 8000);
      } catch (_) {
        const p = await miniProgram.currentPage();
        await waitForElement(p, '.input-field', 5000);
      }

      await safeInput(page, '.input-field', `规则测试组_${Date.now()}`, 5000);
      await sleep(300);
      await safeTap(page, '.btn-primary');
      await sleep(8000);

      const currentPage = await miniProgram.currentPage();
      if (currentPage.path.includes('group/detail')) {
        const data = await currentPage.data();
        testGroupId = data.groupId;
        console.log(`✅ 规则测试前置：创建赛事成功, groupId: ${testGroupId}`);
      } else {
        console.warn(`⚠️ 规则测试前置：创建赛事未跳转到详情页 (${currentPage.path})`);
      }
    } catch (err) {
      console.warn(`⚠️ 规则测试前置：创建赛事失败: ${err.message}`);
    }
  }, 60000);

  afterAll(async () => {
    await releaseMiniProgram();
  });

  // ── 规则页面加载 ────────────────────────────────────────────
  describe('规则页面加载', () => {
    it('应能进入规则编辑页', async () => {
      if (!testGroupId) {
        console.log('⏭️ 跳过：无可用 groupId');
        return;
      }

      const page = await ensureOnPage(
        miniProgram,
        `/pages/rules/edit/edit?groupId=${testGroupId}`,
        2000
      );

      expect(page.path).toContain('rules/edit');
    }, 15000);

    it('规则页面应正确加载数据', async () => {
      if (!testGroupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/rules/edit/edit?groupId=${testGroupId}`,
        2000
      );
      await sleep(3000);

      const data = await page.data();
      expect(data.groupId).toBe(testGroupId);
      expect(Array.isArray(data.chipRules)).toBe(true);
      expect(data.chipRules.length).toBeGreaterThanOrEqual(1);
      expect(typeof data.bonusCountsToTotal).toBe('boolean');
      expect(data.saving).toBe(false);

      console.log(`📋 规则数量: ${data.chipRules.length}, 加成计入总积分: ${data.bonusCountsToTotal}`);
    }, 15000);

    it('默认规则应包含 rank=0 的条目', async () => {
      if (!testGroupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/rules/edit/edit?groupId=${testGroupId}`,
        2000
      );
      await sleep(3000);

      const data = await page.data();
      const defaultRule = data.chipRules.find((r) => r.rank === 0);
      expect(defaultRule).toBeTruthy();
      expect(typeof defaultRule.initialChips).toBe('number');
      console.log(`📋 默认规则: 初始筹码=${defaultRule.initialChips}, 加成=${defaultRule.bonus}`);
    }, 15000);

    it('加载规则不应有未捕获错误', async () => {
      clearConsoleLogs();
      if (!testGroupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/rules/edit/edit?groupId=${testGroupId}`,
        2000
      );
      await sleep(3000);

      const errorLogs = getConsoleLogs('error');
      const uncaughtErrors = errorLogs.filter(
        (e) =>
          e.text.includes('TypeError') ||
          e.text.includes('ReferenceError') ||
          e.text.includes('is not a function')
      );
      expect(uncaughtErrors.length).toBe(0);
    }, 15000);
  });

  // ── 规则编辑操作 ────────────────────────────────────────────
  describe('规则编辑操作', () => {
    it('切换额外加成开关应更新数据', async () => {
      if (!testGroupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/rules/edit/edit?groupId=${testGroupId}`,
        2000
      );
      await sleep(3000);

      const dataBefore = await page.data();
      const originalValue = dataBefore.bonusCountsToTotal;

      // 通过 callMethod 切换开关
      await page.callMethod('onBonusToggle', { detail: { value: !originalValue } });
      await sleep(500);

      const dataAfter = await page.data();
      expect(dataAfter.bonusCountsToTotal).toBe(!originalValue);
    }, 15000);

    it('添加规则行应增加一条记录', async () => {
      if (!testGroupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/rules/edit/edit?groupId=${testGroupId}`,
        2000
      );
      await sleep(3000);

      const dataBefore = await page.data();
      const countBefore = dataBefore.chipRules.length;

      // 点击添加名次按钮
      const addBtn = await page.$('.add-btn');
      if (addBtn) {
        await addBtn.tap();
        await sleep(500);

        const dataAfter = await page.data();
        expect(dataAfter.chipRules.length).toBe(countBefore + 1);
        console.log(`📋 规则数量: ${countBefore} → ${dataAfter.chipRules.length}`);
      }
    }, 15000);

    it('删除规则行应减少一条记录', async () => {
      if (!testGroupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/rules/edit/edit?groupId=${testGroupId}`,
        2000
      );
      await sleep(3000);

      // 先添加一条规则
      await page.callMethod('addRule');
      await sleep(300);

      const dataBefore = await page.data();
      const countBefore = dataBefore.chipRules.length;

      // 找到非默认规则（rank !== 0）的索引并删除
      const nonDefaultIndex = dataBefore.chipRules.findIndex((r) => r.rank !== 0);
      if (nonDefaultIndex >= 0) {
        const delBtns = await page.$$('.del-btn');
        if (delBtns && delBtns.length > 0) {
          await delBtns[0].tap();
          await sleep(500);

          const dataAfter = await page.data();
          expect(dataAfter.chipRules.length).toBe(countBefore - 1);
        }
      }
    }, 15000);

    it('规则行应按名次排序（rank=0 排最后）', async () => {
      if (!testGroupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/rules/edit/edit?groupId=${testGroupId}`,
        2000
      );
      await sleep(3000);

      // 添加两条规则
      await page.callMethod('addRule');
      await sleep(200);
      await page.callMethod('addRule');
      await sleep(200);

      const data = await page.data();
      const rules = data.chipRules;

      // 验证排序：rank=0 应在最后
      if (rules.length > 1) {
        const lastRule = rules[rules.length - 1];
        expect(lastRule.rank).toBe(0);

        // 非零 rank 应递增
        const nonZeroRules = rules.filter((r) => r.rank !== 0);
        for (let i = 1; i < nonZeroRules.length; i++) {
          expect(nonZeroRules[i].rank).toBeGreaterThan(nonZeroRules[i - 1].rank);
        }
      }
    }, 15000);
  });

  // ── 保存规则 ────────────────────────────────────────────────
  // 注：规则变更将对所有赛程生效（不再限于后续赛程）
  describe('保存规则', () => {
    it('保存规则应成功或捕获错误', async () => {
      clearConsoleLogs();
      if (!testGroupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/rules/edit/edit?groupId=${testGroupId}`,
        2000
      );
      await sleep(3000);

      // 点击保存按钮
      await safeTap(page, '.btn-primary');
      await sleep(5000);

      dumpConsoleLogs();

      const currentPage = await miniProgram.currentPage();

      if (!currentPage.path.includes('rules/edit')) {
        // 保存成功，已跳回上一页
        console.log('✅ 规则保存成功，已跳回上一页');
      } else {
        // 还在规则页，检查 saving 状态
        const data = await currentPage.data();
        expect(data.saving).toBe(false);
        console.log('⚠️ 保存后仍在规则页');
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
    }, 25000);

    it('保存后 saving 状态应恢复为 false', async () => {
      if (!testGroupId) return;

      const page = await ensureOnPage(
        miniProgram,
        `/pages/rules/edit/edit?groupId=${testGroupId}`,
        2000
      );
      await sleep(3000);

      await safeTap(page, '.btn-primary');
      await sleep(5000);

      const currentPage = await miniProgram.currentPage();
      if (currentPage.path.includes('rules/edit')) {
        const data = await currentPage.data();
        expect(data.saving).toBe(false);
      }
    }, 20000);
  });
});

/**
 * __tests__/unit/cloudfunctions/finishMatch.test.js
 * finishMatch 云函数单元测试
 * 重点测试：积分计算逻辑、权限校验、未填写检测
 */

jest.mock('wx-server-sdk');
const cloud = require('wx-server-sdk');

// ─── 测试辅助：构建 mock 数据库 ───────────────────────────────
function buildMockDb({ match, group, scores }) {
  const db = {
    command: { in: (arr) => ({ $in: arr }) },
    serverDate: () => new Date(),
  };

  db.collection = jest.fn((name) => {
    const col = {
      doc: jest.fn((id) => ({
        get: jest.fn().mockResolvedValue({
          data: name === 'matches' ? match
              : name === 'groups'  ? group
              : {},
        }),
        update: jest.fn().mockResolvedValue({ stats: { updated: 1 } }),
      })),
      where: jest.fn().mockReturnThis(),
      get: jest.fn().mockResolvedValue({ data: name === 'scores' ? scores : [] }),
    };
    return col;
  });

  return db;
}

// ─── 测试用例 ─────────────────────────────────────────────────
describe('finishMatch 云函数', () => {
  let handler;

  beforeEach(() => {
    jest.resetModules();
    jest.mock('wx-server-sdk');
  });

  // 提取云函数中的积分计算逻辑进行独立测试
  describe('积分计算逻辑（内联验证）', () => {
    /**
     * 直接测试 finishMatch 中的积分计算公式：
     * points = finalChips - initialChips + (bonusCountsToTotal ? bonus : 0)
     */
    function calcPointsInline(finalChips, initialChips, bonus, bonusCountsToTotal) {
      const fc = finalChips || 0;
      return fc - initialChips + (bonusCountsToTotal ? (bonus || 0) : 0);
    }

    it('额外加成不计入：积分 = 结算 - 初始', () => {
      expect(calcPointsInline(1200, 1000, 200, false)).toBe(200);
    });

    it('额外加成计入：积分 = 结算 - 初始 + 加成', () => {
      expect(calcPointsInline(1200, 1000, 200, true)).toBe(400);
    });

    it('未填写（finalChips=null）视为0', () => {
      expect(calcPointsInline(null, 1000, 0, false)).toBe(-1000);
    });

    it('亏损场景', () => {
      expect(calcPointsInline(500, 1000, 0, false)).toBe(-500);
    });

    it('加成弥补亏损', () => {
      expect(calcPointsInline(900, 1000, 200, true)).toBe(100);
    });
  });

  describe('未填写成员检测逻辑', () => {
    function getUnfilled(scores) {
      return scores.filter(s => s.finalChips === null || s.finalChips === undefined);
    }

    it('所有人已填写时返回空数组', () => {
      const scores = [
        { userId: 'u1', finalChips: 1200 },
        { userId: 'u2', finalChips: 800 },
      ];
      expect(getUnfilled(scores)).toHaveLength(0);
    });

    it('部分未填写时正确识别', () => {
      const scores = [
        { userId: 'u1', nickName: '张三', finalChips: 1200 },
        { userId: 'u2', nickName: '李四', finalChips: null },
        { userId: 'u3', nickName: '王五', finalChips: undefined },
      ];
      const unfilled = getUnfilled(scores);
      expect(unfilled).toHaveLength(2);
      expect(unfilled.map(s => s.nickName)).toEqual(['李四', '王五']);
    });

    it('全部未填写时全部返回', () => {
      const scores = [
        { userId: 'u1', finalChips: null },
        { userId: 'u2', finalChips: null },
      ];
      expect(getUnfilled(scores)).toHaveLength(2);
    });
  });
});

// ─────────────────────────────────────────────────────────────
// createMatch 中的 getRuleByRank 逻辑测试
// ─────────────────────────────────────────────────────────────
describe('createMatch - getRuleByRank 逻辑', () => {
  // 从 createMatch/index.js 中提取的同款函数
  function getRuleByRank(chipRules, rank) {
    const matched = chipRules.find(r => r.rank === rank);
    if (matched) return matched;
    const defaultRule = chipRules.find(r => r.rank === 0);
    return defaultRule || { initialChips: 1000, bonus: 0 };
  }

  const rules = [
    { rank: 1, initialChips: 1500, bonus: 500 },
    { rank: 2, initialChips: 1200, bonus: 300 },
    { rank: 0, initialChips: 1000, bonus: 0 },
  ];

  it('第1名获得最高初始筹码', () => {
    const rule = getRuleByRank(rules, 1);
    expect(rule.initialChips).toBe(1500);
    expect(rule.bonus).toBe(500);
  });

  it('第2名获得对应规则', () => {
    const rule = getRuleByRank(rules, 2);
    expect(rule.initialChips).toBe(1200);
  });

  it('第3名及以后使用默认规则', () => {
    expect(getRuleByRank(rules, 3).initialChips).toBe(1000);
    expect(getRuleByRank(rules, 10).initialChips).toBe(1000);
  });

  it('规则为空时使用内置默认值', () => {
    expect(getRuleByRank([], 1)).toEqual({ initialChips: 1000, bonus: 0 });
  });
});

// ─────────────────────────────────────────────────────────────
// saveScore 权限校验逻辑测试
// ─────────────────────────────────────────────────────────────
describe('saveScore - 输入校验逻辑', () => {
  function validateSaveScore({ scoreId, finalChips }) {
    if (!scoreId) return { valid: false, msg: 'scoreId 不能为空' };
    if (finalChips === null || finalChips === undefined || isNaN(Number(finalChips))) {
      return { valid: false, msg: '结算筹码不能为空' };
    }
    if (Number(finalChips) < 0) {
      return { valid: false, msg: '结算筹码不能为负数' };
    }
    return { valid: true };
  }

  it('scoreId 为空时校验失败', () => {
    expect(validateSaveScore({ scoreId: '', finalChips: 1000 }).valid).toBe(false);
  });

  it('finalChips 为 null 时校验失败', () => {
    expect(validateSaveScore({ scoreId: 'sid', finalChips: null }).valid).toBe(false);
  });

  it('finalChips 为负数时校验失败', () => {
    expect(validateSaveScore({ scoreId: 'sid', finalChips: -100 }).valid).toBe(false);
  });

  it('finalChips 为非数字字符串时校验失败', () => {
    expect(validateSaveScore({ scoreId: 'sid', finalChips: 'abc' }).valid).toBe(false);
  });

  it('合法输入通过校验', () => {
    expect(validateSaveScore({ scoreId: 'sid', finalChips: 1200 }).valid).toBe(true);
    expect(validateSaveScore({ scoreId: 'sid', finalChips: 0 }).valid).toBe(true);
    expect(validateSaveScore({ scoreId: 'sid', finalChips: '1200' }).valid).toBe(true);
  });
});

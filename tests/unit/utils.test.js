/**
 * __tests__/unit/utils.test.js
 * utils/util.js 单元测试
 */

// util.js 中有 wx.showToast 等调用，需要 mock wx 全局对象
global.wx = {
  showToast: jest.fn(),
  showLoading: jest.fn(),
  hideLoading: jest.fn(),
};

const {
  formatDate,
  generateInviteCode,
  calcPoints,
  getRuleByRank,
} = require('../../utils/util');

// ─────────────────────────────────────────
// formatDate
// ─────────────────────────────────────────
describe('formatDate', () => {
  it('空值返回空字符串', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
  });

  it('正确格式化 Date 对象', () => {
    // 固定一个时间避免时区问题
    const d = new Date(2024, 3, 20, 14, 5); // 2024-04-20 14:05
    const result = formatDate(d);
    expect(result).toBe('2024-04-20 14:05');
  });

  it('正确格式化 ISO 字符串', () => {
    const result = formatDate('2024-01-05T08:03:00.000Z');
    // 只验证格式，不验证具体值（时区差异）
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
  });
});

// ─────────────────────────────────────────
// generateInviteCode
// ─────────────────────────────────────────
describe('generateInviteCode', () => {
  it('生成6位字符串', () => {
    const code = generateInviteCode();
    expect(code).toHaveLength(6);
  });

  it('只包含合法字符（大写字母+数字，排除易混淆字符）', () => {
    const code = generateInviteCode();
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/);
  });

  it('多次生成结果不完全相同（随机性）', () => {
    const codes = new Set(Array.from({ length: 20 }, () => generateInviteCode()));
    // 20次生成至少有2个不同（极低概率全相同）
    expect(codes.size).toBeGreaterThan(1);
  });
});

// ─────────────────────────────────────────
// calcPoints
// ─────────────────────────────────────────
describe('calcPoints - 积分计算', () => {
  describe('额外加成不计入总积分（bonusCountsToTotal = false）', () => {
    it('盈利：结算 > 初始', () => {
      expect(calcPoints(1200, 1000, 200, false)).toBe(200);
    });

    it('亏损：结算 < 初始', () => {
      expect(calcPoints(800, 1000, 200, false)).toBe(-200);
    });

    it('持平：结算 = 初始', () => {
      expect(calcPoints(1000, 1000, 200, false)).toBe(0);
    });

    it('额外加成不影响积分', () => {
      expect(calcPoints(1200, 1000, 500, false)).toBe(200);
    });
  });

  describe('额外加成计入总积分（bonusCountsToTotal = true）', () => {
    it('盈利 + 加成', () => {
      expect(calcPoints(1200, 1000, 200, true)).toBe(400);
    });

    it('亏损 + 加成可能为正', () => {
      expect(calcPoints(900, 1000, 200, true)).toBe(100);
    });

    it('亏损 + 加成仍为负', () => {
      expect(calcPoints(700, 1000, 100, true)).toBe(-200);
    });

    it('加成为0时与不计入结果相同', () => {
      expect(calcPoints(1200, 1000, 0, true)).toBe(200);
    });
  });

  describe('边界情况', () => {
    it('finalChips 为 null 时视为 0', () => {
      expect(calcPoints(null, 1000, 0, false)).toBe(-1000);
    });

    it('initialChips 为 null 时视为 0', () => {
      expect(calcPoints(1000, null, 0, false)).toBe(1000);
    });

    it('bonus 为 null 时视为 0', () => {
      expect(calcPoints(1200, 1000, null, true)).toBe(200);
    });

    it('全部为 0', () => {
      expect(calcPoints(0, 0, 0, false)).toBe(0);
    });
  });
});

// ─────────────────────────────────────────
// getRuleByRank
// ─────────────────────────────────────────
describe('getRuleByRank - 按名次获取规则', () => {
  const rules = [
    { rank: 1, initialChips: 1200, bonus: 300 },
    { rank: 2, initialChips: 1000, bonus: 200 },
    { rank: 3, initialChips: 800,  bonus: 100 },
    { rank: 0, initialChips: 600,  bonus: 0   }, // 默认规则
  ];

  it('精确匹配第1名', () => {
    expect(getRuleByRank(rules, 1)).toEqual({ rank: 1, initialChips: 1200, bonus: 300 });
  });

  it('精确匹配第2名', () => {
    expect(getRuleByRank(rules, 2)).toEqual({ rank: 2, initialChips: 1000, bonus: 200 });
  });

  it('精确匹配第3名', () => {
    expect(getRuleByRank(rules, 3)).toEqual({ rank: 3, initialChips: 800, bonus: 100 });
  });

  it('未上榜（第4名及以后）使用默认规则', () => {
    expect(getRuleByRank(rules, 4)).toEqual({ rank: 0, initialChips: 600, bonus: 0 });
    expect(getRuleByRank(rules, 99)).toEqual({ rank: 0, initialChips: 600, bonus: 0 });
  });

  it('规则为空时返回内置默认值', () => {
    expect(getRuleByRank([], 1)).toEqual({ initialChips: 1000, bonus: 0 });
    expect(getRuleByRank(null, 1)).toEqual({ initialChips: 1000, bonus: 0 });
  });

  it('无默认规则（rank=0）时返回内置默认值', () => {
    const rulesNoDefault = [
      { rank: 1, initialChips: 1200, bonus: 300 },
    ];
    expect(getRuleByRank(rulesNoDefault, 5)).toEqual({ initialChips: 1000, bonus: 0 });
  });

  it('只有默认规则时所有名次都使用默认', () => {
    const onlyDefault = [{ rank: 0, initialChips: 800, bonus: 50 }];
    expect(getRuleByRank(onlyDefault, 1)).toEqual({ rank: 0, initialChips: 800, bonus: 50 });
    expect(getRuleByRank(onlyDefault, 10)).toEqual({ rank: 0, initialChips: 800, bonus: 50 });
  });
});

/**
 * tests/unit/cloudfunctions.test.js
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
     * 注：bonusCountsToTotal 从 group 文档读取（不再从 match.rulesSnapshot）
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
// createMatch 新规则逻辑：统一初始筹码 + 初始状态无名次
// ─────────────────────────────────────────────────────────────
describe('createMatch - 统一初始筹码与初始状态名次逻辑', () => {
  function getRuleByRank(chipRules, rank) {
    const matched = chipRules.find(r => r.rank === rank);
    if (matched) return matched;
    const defaultRule = chipRules.find(r => r.rank === 0);
    return defaultRule || { initialChips: 1000, bonus: 0 };
  }

  const chipRules = [
    { rank: 1, initialChips: 1000, bonus: 0 },
    { rank: 2, initialChips: 1000, bonus: 500 },
    { rank: 0, initialChips: 1000, bonus: 300 },
  ];

  // 模拟 createMatch 中的分配逻辑
  function assignScores(members, chipRules, hasHistory) {
    const defaultRule = getRuleByRank(chipRules, 0);
    const unifiedInitialChips = defaultRule.initialChips;
    return members.map((member, index) => {
      const rank = hasHistory ? index + 1 : 0;
      const bonusRule = getRuleByRank(chipRules, rank);
      return {
        userId: member.userId,
        initialChips: unifiedInitialChips,
        bonus: bonusRule.bonus,
      };
    });
  }

  it('无历史赛程时：所有成员使用 rank=0 的规则（初始筹码和额外加成均使用默认规则）', () => {
    const members = [
      { userId: 'u1' },
      { userId: 'u2' },
      { userId: 'u3' },
    ];
    const scores = assignScores(members, chipRules, false);

    // 所有人初始筹码相同
    scores.forEach(s => expect(s.initialChips).toBe(1000));
    // 所有人 bonus 使用 rank=0 的默认值
    scores.forEach(s => expect(s.bonus).toBe(300));
  });

  it('有历史赛程时：initialChips 对所有成员相同，bonus 按名次差异化', () => {
    const members = [
      { userId: 'u1' },  // 第1名
      { userId: 'u2' },  // 第2名
      { userId: 'u3' },  // 第3名（使用默认规则）
    ];
    const scores = assignScores(members, chipRules, true);

    // 所有人初始筹码相同（统一）
    scores.forEach(s => expect(s.initialChips).toBe(1000));

    // bonus 按名次差异化
    expect(scores[0].bonus).toBe(0);    // 第1名
    expect(scores[1].bonus).toBe(500);  // 第2名
    expect(scores[2].bonus).toBe(300);  // 第3名（默认规则）
  });

  it('统一初始筹码始终从 rank=0 读取，不受其他名次影响', () => {
    const rulesWithDiffChips = [
      { rank: 1, initialChips: 9999, bonus: 0 },  // 即使 rank=1 有不同值
      { rank: 0, initialChips: 1000, bonus: 0 },
    ];
    const members = [{ userId: 'u1' }, { userId: 'u2' }];
    const scores = assignScores(members, rulesWithDiffChips, true);

    // 统一初始筹码应从 rank=0 读取，而非 rank=1
    scores.forEach(s => expect(s.initialChips).toBe(1000));
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

// ─────────────────────────────────────────────────────────────
// getQRCode 云函数测试
// ─────────────────────────────────────────────────────────────
describe('getQRCode 云函数', () => {
  let handler;
  let mockGetUnlimited;

  beforeEach(() => {
    jest.resetModules();
    jest.mock('wx-server-sdk');
    const cloud = require('wx-server-sdk');
    mockGetUnlimited = cloud._mockGetUnlimited;
    // 重置为默认成功行为
    mockGetUnlimited.mockResolvedValue({
      buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    });
    handler = require('../../cloudfunctions/getQRCode/index').main;
  });

  it('正常生成：返回 code=0 和 base64 字符串', async () => {
    const result = await handler({
      scene: 'inviteCode=ABC123',
      page: 'pages/group/list/list',
    });

    expect(result.code).toBe(0);
    expect(typeof result.base64).toBe('string');
    expect(result.base64.startsWith('data:image/png;base64,')).toBe(true);
  });

  it('base64 内容与 buffer 一致', async () => {
    const fakeBuffer = Buffer.from('fake-png-content');
    mockGetUnlimited.mockResolvedValue({ buffer: fakeBuffer });

    const result = await handler({ scene: 'inviteCode=XYZ', page: 'pages/group/list/list' });

    expect(result.code).toBe(0);
    const expectedBase64 = 'data:image/png;base64,' + fakeBuffer.toString('base64');
    expect(result.base64).toBe(expectedBase64);
  });

  it('传入正确的 scene 和 page 参数给 getUnlimited', async () => {
    await handler({
      scene: 'inviteCode=TEST01',
      page: 'pages/group/list/list',
    });

    expect(mockGetUnlimited).toHaveBeenCalledWith(
      expect.objectContaining({
        scene: 'inviteCode=TEST01',
        page: 'pages/group/list/list',
      })
    );
  });

  it('page 未传时使用默认落地页', async () => {
    await handler({ scene: 'inviteCode=TEST02' });

    expect(mockGetUnlimited).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 'pages/group/list/list',
      })
    );
  });

  it('不传 envVersion 参数（避免版本限制）', async () => {
    await handler({ scene: 'inviteCode=TEST03', page: 'pages/group/list/list' });

    const callArg = mockGetUnlimited.mock.calls[0][0];
    expect(callArg.envVersion).toBeUndefined();
  });

  it('getUnlimited 抛出异常时返回 code=-1', async () => {
    mockGetUnlimited.mockRejectedValue(new Error('openapi 调用失败'));

    const result = await handler({
      scene: 'inviteCode=FAIL',
      page: 'pages/group/list/list',
    });

    expect(result.code).toBe(-1);
    expect(result.message).toContain('openapi 调用失败');
  });

  it('getUnlimited 返回权限错误时返回 code=-1', async () => {
    mockGetUnlimited.mockRejectedValue(new Error('permission denied: wxacode.getUnlimited'));

    const result = await handler({ scene: 'inviteCode=PERM', page: 'pages/group/list/list' });

    expect(result.code).toBe(-1);
    expect(result.message).toContain('permission denied');
  });
});

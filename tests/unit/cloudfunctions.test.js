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
// saveScore 真实云函数权限与状态校验
// ─────────────────────────────────────────────────────────────
describe('saveScore 云函数', () => {
  function setup({ openId, scoreUserId = 'member', adminId = 'admin', matchStatus = 'active' }) {
    jest.resetModules();
    const mockCloud = require('wx-server-sdk');
    const scoreUpdate = jest.fn().mockResolvedValue({ stats: { updated: 1 } });
    const records = {
      scores: { score1: { _id: 'score1', userId: scoreUserId, groupId: 'group1', matchId: 'match1' } },
      groups: { group1: { _id: 'group1', adminId } },
      matches: { match1: { _id: 'match1', status: matchStatus } },
    };
    const db = {
      serverDate: jest.fn(() => 'server-date'),
      collection: jest.fn((name) => ({
        doc: jest.fn((id) => ({
          get: jest.fn().mockResolvedValue({ data: records[name][id] }),
          update: name === 'scores' ? scoreUpdate : jest.fn(),
        })),
      })),
    };

    mockCloud.getWXContext.mockReturnValue({ OPENID: openId });
    mockCloud.database.mockReturnValue(db);
    const handler = require('../../cloudfunctions/saveScore/index').main;
    return { handler, db, scoreUpdate };
  }

  it('拒绝缺少 scoreId 或非法结算积分', async () => {
    const { handler, scoreUpdate } = setup({ openId: 'member', scoreUserId: 'member' });

    await expect(handler({ finalChips: 1000 })).resolves.toEqual({ code: -1, msg: 'scoreId 不能为空' });
    await expect(handler({ scoreId: 'score1', finalChips: null })).resolves.toEqual({ code: -1, msg: '结算积分不能为空' });
    await expect(handler({ scoreId: 'score1', finalChips: 'abc' })).resolves.toEqual({ code: -1, msg: '结算积分不能为空' });
    expect(scoreUpdate).not.toHaveBeenCalled();
  });

  it('本人可以修改进行中对局的分数', async () => {
    const { handler, db, scoreUpdate } = setup({ openId: 'member', scoreUserId: 'member' });

    await expect(handler({ scoreId: 'score1', finalChips: '1200' })).resolves.toEqual({ code: 0 });
    expect(scoreUpdate).toHaveBeenCalledWith({
      data: { finalChips: 1200, updatedAt: 'server-date' },
    });
    expect(db.collection.mock.calls.map(([name]) => name)).not.toContain('groups');
  });

  it('管理员可以代填同组其他成员的分数', async () => {
    const { handler, scoreUpdate } = setup({ openId: 'admin', scoreUserId: 'member', adminId: 'admin' });

    await expect(handler({ scoreId: 'score1', finalChips: -100 })).resolves.toEqual({ code: 0 });
    expect(scoreUpdate).toHaveBeenCalledWith({
      data: { finalChips: -100, updatedAt: 'server-date' },
    });
  });

  it('拒绝非本人且非管理员修改他人分数', async () => {
    const { handler, scoreUpdate } = setup({ openId: 'outsider', scoreUserId: 'member', adminId: 'admin' });

    await expect(handler({ scoreId: 'score1', finalChips: 800 })).resolves.toEqual({
      code: -1,
      msg: '只有本人或管理员可以修改分数',
    });
    expect(scoreUpdate).not.toHaveBeenCalled();
  });

  it('本人和管理员都不能修改已结束对局', async () => {
    const owner = setup({ openId: 'member', scoreUserId: 'member', matchStatus: 'finished' });
    await expect(owner.handler({ scoreId: 'score1', finalChips: 800 })).resolves.toEqual({
      code: -1,
      msg: '对局已结束，无法修改分数',
    });
    expect(owner.scoreUpdate).not.toHaveBeenCalled();

    const admin = setup({ openId: 'admin', scoreUserId: 'member', adminId: 'admin', matchStatus: 'finished' });
    await expect(admin.handler({ scoreId: 'score1', finalChips: 800 })).resolves.toEqual({
      code: -1,
      msg: '对局已结束，无法修改分数',
    });
    expect(admin.scoreUpdate).not.toHaveBeenCalled();
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

// cloudfunctions/createMatch/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

/**
 * 创建赛程云函数
 * 同时根据当前总积分排名，为每个成员分配初始筹码和额外加成
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const adminId = wxContext.OPENID;
  const { groupId, title } = event;

  if (!groupId) {
    return { code: -1, msg: 'groupId 不能为空' };
  }

  try {
    // 验证是否为管理员
    const groupRes = await db.collection('groups').doc(groupId).get();
    const group = groupRes.data;

    if (group.adminId !== adminId) {
      return { code: -1, msg: '只有管理员才能创建赛程' };
    }

    // 获取组成员
    const { data: members } = await db.collection('group_members')
      .where({ groupId })
      .get();

    // 计算当前总积分排名
    const leaderboard = await calcCurrentLeaderboard(groupId, members);

    // 保存规则快照
    const rulesSnapshot = {
      chipRules: group.chipRules || [{ rank: 0, initialChips: 1000, bonus: 0 }],
      bonusCountsToTotal: group.bonusCountsToTotal || false,
    };

    // 创建赛程
    const matchRes = await db.collection('matches').add({
      data: {
        groupId,
        title: title || '',
        status: 'active',
        rulesSnapshot,
        createdAt: db.serverDate(),
      },
    });

    const matchId = matchRes._id;

    // 为每个成员创建初始分数记录（含初始筹码和额外加成）
    const chipRules = rulesSnapshot.chipRules;
    const scorePromises = leaderboard.map((member, index) => {
      const rank = index + 1;
      const rule = getRuleByRank(chipRules, rank);
      return db.collection('scores').add({
        data: {
          matchId,
          groupId,
          userId: member.userId,
          nickName: member.nickName,
          initialChips: rule.initialChips,
          bonus: rule.bonus,
          finalChips: null,
          points: null,
          updatedAt: db.serverDate(),
        },
      });
    });

    await Promise.all(scorePromises);

    return { code: 0, matchId };
  } catch (err) {
    console.error('createMatch error:', err);
    return { code: -1, msg: err.message };
  }
};

/**
 * 计算当前总积分排名
 */
async function calcCurrentLeaderboard(groupId, members) {
  const { data: finishedMatches } = await db.collection('matches')
    .where({ groupId, status: 'finished' })
    .get();

  if (finishedMatches.length === 0) {
    return members.map(m => ({ userId: m.userId, nickName: m.nickName, totalPoints: 0 }));
  }

  const matchIds = finishedMatches.map(m => m._id);
  const { data: scores } = await db.collection('scores')
    .where({ matchId: db.command.in(matchIds) })
    .get();

  const pointsMap = {};
  scores.forEach(s => {
    pointsMap[s.userId] = (pointsMap[s.userId] || 0) + (s.points || 0);
  });

  return members
    .map(m => ({ userId: m.userId, nickName: m.nickName, totalPoints: pointsMap[m.userId] || 0 }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

/**
 * 根据排名获取规则
 */
function getRuleByRank(chipRules, rank) {
  const matched = chipRules.find(r => r.rank === rank);
  if (matched) return matched;
  const defaultRule = chipRules.find(r => r.rank === 0);
  return defaultRule || { initialChips: 1000, bonus: 0 };
}

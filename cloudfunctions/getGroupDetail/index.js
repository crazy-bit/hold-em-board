// cloudfunctions/getGroupDetail/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: 'cloud1-d1goy6u8nf336912a' });

const db = cloud.database();

/**
 * 获取赛事详情云函数
 * 使用管理员权限查询，绕过前端安全规则限制
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;
  const { groupId } = event;

  if (!groupId) {
    return { code: -1, msg: 'groupId 不能为空' };
  }

  try {
    // 并行查询组信息、成员、赛程
    const [groupRes, membersRes, matchesRes] = await Promise.all([
      db.collection('groups').doc(groupId).get(),
      db.collection('group_members').where({ groupId }).orderBy('joinedAt', 'asc').get(),
      db.collection('matches').where({ groupId }).orderBy('createdAt', 'desc').get(),
    ]);

    const group = groupRes.data;
    const members = membersRes.data;
    const matches = matchesRes.data;
    const isAdmin = group.adminId === openId;

    // 计算积分榜
    let leaderboard = [];
    const finishedMatches = matches.filter(m => m.status === 'finished');

    if (finishedMatches.length === 0) {
      leaderboard = members.map(m => ({
        userId: m.userId,
        nickName: m.nickName,
        totalPoints: 0,
        matchCount: 0,
      }));
    } else {
      const matchIds = finishedMatches.map(m => m._id);
      const { data: scores } = await db.collection('scores')
        .where({ matchId: db.command.in(matchIds) })
        .get();

      const pointsMap = {};
      const countMap = {};
      scores.forEach(s => {
        if (!pointsMap[s.userId]) {
          pointsMap[s.userId] = 0;
          countMap[s.userId] = 0;
        }
        pointsMap[s.userId] += s.points || 0;
        countMap[s.userId]++;
      });

      leaderboard = members.map(m => ({
        userId: m.userId,
        nickName: m.nickName,
        totalPoints: pointsMap[m.userId] || 0,
        matchCount: countMap[m.userId] || 0,
      })).sort((a, b) => b.totalPoints - a.totalPoints);
    }

    return {
      code: 0,
      group,
      members,
      matches,
      isAdmin,
      leaderboard,
      openId,
    };
  } catch (err) {
    console.error('getGroupDetail error:', err);
    return { code: -1, msg: err.message || '获取详情失败' };
  }
};

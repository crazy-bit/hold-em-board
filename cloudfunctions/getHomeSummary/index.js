// cloudfunctions/getHomeSummary/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: 'cloud1-d1goy6u8nf336912a' });

const db = cloud.database();

/**
 * 获取首页摘要云函数
 * 返回用户最近参与赛事的积分和排名
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  try {
    // 1. 查询用户加入的所有赛事
    const { data: members } = await db.collection('group_members')
      .where({ userId: openId })
      .orderBy('joinedAt', 'desc')
      .get();

    if (members.length === 0) {
      return { code: 0, group: null };
    }

    const groupIds = members.map(m => m.groupId);

    // 2. 查询所有赛事的最新赛程，找到最近活跃的赛事
    const { data: latestMatches } = await db.collection('matches')
      .where({ groupId: db.command.in(groupIds) })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    // 如果没有任何赛程，取最近加入的赛事
    let targetGroupId;
    if (latestMatches.length > 0) {
      targetGroupId = latestMatches[0].groupId;
    } else {
      targetGroupId = groupIds[0];
    }

    // 3. 获取赛事信息
    const groupRes = await db.collection('groups').doc(targetGroupId).get();
    const group = groupRes.data;

    // 4. 获取该赛事的所有成员
    const { data: groupMembers } = await db.collection('group_members')
      .where({ groupId: targetGroupId })
      .get();

    // 5. 获取已结束赛程
    const { data: finishedMatches } = await db.collection('matches')
      .where({ groupId: targetGroupId, status: 'finished' })
      .get();

    if (finishedMatches.length === 0) {
      return {
        code: 0,
        group: { _id: group._id, name: group.name },
        myRank: 0,
        myPoints: 0,
        totalMembers: groupMembers.length,
        matchCount: 0,
      };
    }

    // 6. 获取所有分数并计算排名
    const matchIds = finishedMatches.map(m => m._id);
    const { data: scores } = await db.collection('scores')
      .where({ matchId: db.command.in(matchIds) })
      .limit(1000)
      .get();

    const pointsMap = {};
    scores.forEach(s => {
      pointsMap[s.userId] = (pointsMap[s.userId] || 0) + (s.points || 0);
    });

    // 按积分降序排名
    const ranking = groupMembers
      .map(m => ({ userId: m.userId, points: pointsMap[m.userId] || 0 }))
      .sort((a, b) => b.points - a.points);

    const myIndex = ranking.findIndex(r => r.userId === openId);
    const myRank = myIndex >= 0 ? myIndex + 1 : 0;
    const myPoints = myIndex >= 0 ? ranking[myIndex].points : 0;

    return {
      code: 0,
      group: { _id: group._id, name: group.name },
      myRank,
      myPoints,
      totalMembers: groupMembers.length,
      matchCount: finishedMatches.length,
    };
  } catch (err) {
    console.error('getHomeSummary error:', err);
    return { code: -1, msg: err.message || '获取首页数据失败' };
  }
};

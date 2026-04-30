// cloudfunctions/getHomeSummary/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: 'cloud1-d1goy6u8nf336912a' });

const db = cloud.database();

/**
 * 获取首页摘要云函数
 * 返回用户最近参与组团的积分和排名
 */
exports.main = async (event, context) => {
  const t0 = Date.now();
  console.log('[getHomeSummary] 开始执行');
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  try {
    // 1. 查询用户加入的所有组团
    const { data: members } = await db.collection('group_members')
      .where({ userId: openId })
      .orderBy('joinedAt', 'desc')
      .get();
    console.log('[getHomeSummary] 查询 group_members 完成', Date.now() - t0, 'ms, 数量:', members.length);

    if (members.length === 0) {
      return { code: 0, group: null };
    }

    const groupIds = members.map(m => m.groupId);

    // 2. 查询所有组团的最新对局，找到最近活跃的组团
    const { data: latestMatches } = await db.collection('matches')
      .where({ groupId: db.command.in(groupIds) })
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    console.log('[getHomeSummary] 查询最新对局完成', Date.now() - t0, 'ms');

    // 如果没有任何对局，取最近加入的组团
    let targetGroupId;
    if (latestMatches.length > 0) {
      targetGroupId = latestMatches[0].groupId;
    } else {
      targetGroupId = groupIds[0];
    }

    // 3. 并行查询：组团信息 + 成员列表 + 已结束对局
    const [groupRes, membersRes, matchesRes] = await Promise.all([
      db.collection('groups').doc(targetGroupId).get(),
      db.collection('group_members').where({ groupId: targetGroupId }).get(),
      db.collection('matches').where({ groupId: targetGroupId, status: 'finished' }).get(),
    ]);
    console.log('[getHomeSummary] 并行查询(组团+成员+对局)完成', Date.now() - t0, 'ms');

    const group = groupRes.data;
    const groupMembers = membersRes.data;
    const finishedMatches = matchesRes.data;

    if (finishedMatches.length === 0) {
      console.log('[getHomeSummary] 无已结束对局，总耗时', Date.now() - t0, 'ms');
      return {
        code: 0,
        group: { _id: group._id, name: group.name },
        myRank: 0,
        myPoints: 0,
        totalMembers: groupMembers.length,
        matchCount: 0,
      };
    }

    // 4. 获取所有分数并计算排名
    const matchIds = finishedMatches.map(m => m._id);
    const { data: scores } = await db.collection('scores')
      .where({ matchId: db.command.in(matchIds) })
      .limit(1000)
      .get();
    console.log('[getHomeSummary] 查询 scores 完成', Date.now() - t0, 'ms, 数量:', scores.length);

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

    console.log('[getHomeSummary] 计算完成，总耗时', Date.now() - t0, 'ms');

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

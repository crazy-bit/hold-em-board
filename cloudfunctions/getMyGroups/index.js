// cloudfunctions/getMyGroups/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: 'cloud1-d1goy6u8nf336912a' });

const db = cloud.database();
const $ = db.command.aggregate;

/**
 * 获取当前用户的赛事列表云函数
 * 使用聚合查询一次性获取所有组的成员数和赛程数，避免 N×2 次串行查询
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  try {
    // 1. 查询用户加入的所有组
    const { data: members } = await db.collection('group_members')
      .where({ userId: openId })
      .orderBy('joinedAt', 'desc')
      .get();

    if (members.length === 0) {
      return { code: 0, groups: [] };
    }

    const groupIds = members.map(m => m.groupId);
    const memberMap = {};
    members.forEach(m => { memberMap[m.groupId] = m; });

    // 2. 批量查询赛事信息
    const { data: groupsData } = await db.collection('groups')
      .where({ _id: db.command.in(groupIds) })
      .get();

    // 3. 聚合查询：一次性统计所有组的成员数
    const memberCountRes = await db.collection('group_members')
      .aggregate()
      .match({ groupId: db.command.in(groupIds) })
      .group({ _id: '$groupId', count: $.sum(1) })
      .end();

    const memberCountMap = {};
    (memberCountRes.list || []).forEach(item => {
      memberCountMap[item._id] = item.count;
    });

    // 4. 聚合查询：一次性统计所有组的赛程数
    const matchCountRes = await db.collection('matches')
      .aggregate()
      .match({ groupId: db.command.in(groupIds) })
      .group({ _id: '$groupId', count: $.sum(1) })
      .end();

    const matchCountMap = {};
    (matchCountRes.list || []).forEach(item => {
      matchCountMap[item._id] = item.count;
    });

    // 5. 组装结果
    const groups = groupsData.map(g => ({
      ...g,
      memberCount: memberCountMap[g._id] || 0,
      matchCount: matchCountMap[g._id] || 0,
      isAdmin: g.adminId === openId,
    }));

    // 按加入时间排序
    groups.sort((a, b) => {
      const ta = memberMap[a._id] && memberMap[a._id].joinedAt;
      const tb = memberMap[b._id] && memberMap[b._id].joinedAt;
      return (tb ? new Date(tb) : 0) - (ta ? new Date(ta) : 0);
    });

    return { code: 0, groups };
  } catch (err) {
    console.error('getMyGroups error:', err);
    return { code: -1, msg: err.message || '获取列表失败' };
  }
};

// cloudfunctions/finishMatch/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: 'cloud1-d1goy6u8nf336912a' });

const db = cloud.database();

/**
 * 结束赛程云函数
 * 计算每人本期积分，更新赛程状态为 finished
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const adminId = wxContext.OPENID;
  const { matchId, force } = event;

  if (!matchId) {
    return { code: -1, msg: 'matchId 不能为空' };
  }

  try {
    // 获取赛程信息
    const matchRes = await db.collection('matches').doc(matchId).get();
    const match = matchRes.data;

    if (match.status !== 'active') {
      return { code: -1, msg: '赛程已结束或已作废' };
    }

    // 验证管理员权限
    const groupRes = await db.collection('groups').doc(match.groupId).get();
    if (groupRes.data.adminId !== adminId) {
      return { code: -1, msg: '只有管理员才能结束赛程' };
    }

    // 获取所有分数记录
    const { data: scores } = await db.collection('scores')
      .where({ matchId })
      .get();

    // 检查未填写人员
    const unfilledScores = scores.filter(s => s.finalChips === null || s.finalChips === undefined);
    if (unfilledScores.length > 0 && !force) {
      return {
        code: 1, // 特殊状态码：需要确认
        msg: '有成员未填写结算筹码',
        unfilledMembers: unfilledScores.map(s => s.nickName),
      };
    }

    // 计算每人本期积分
    const bonusCountsToTotal = match.rulesSnapshot && match.rulesSnapshot.bonusCountsToTotal;
    const updatePromises = scores.map(s => {
      const finalChips = s.finalChips || 0;
      const points = finalChips - s.initialChips + (bonusCountsToTotal ? (s.bonus || 0) : 0);
      return db.collection('scores').doc(s._id).update({
        data: { points, updatedAt: db.serverDate() },
      });
    });

    await Promise.all(updatePromises);

    // 更新赛程状态
    await db.collection('matches').doc(matchId).update({
      data: {
        status: 'finished',
        finishedAt: db.serverDate(),
      },
    });

    return { code: 0 };
  } catch (err) {
    console.error('finishMatch error:', err);
    return { code: -1, msg: err.message };
  }
};

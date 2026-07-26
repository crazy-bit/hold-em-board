// cloudfunctions/saveScore/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: 'cloud1-d1goy6u8nf336912a' });

const db = cloud.database();

/**
 * 保存/更新分数记录云函数
 * 允许用户修改自己的分数记录，或由组团管理员（创建者）代填他人分数
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;
  const { scoreId, finalChips } = event;

  if (!scoreId) {
    return { code: -1, msg: 'scoreId 不能为空' };
  }

  if (finalChips === null || finalChips === undefined || isNaN(Number(finalChips))) {
    return { code: -1, msg: '结算积分不能为空' };
  }

  const chips = Number(finalChips);

  try {
    // 获取分数记录
    const scoreRes = await db.collection('scores').doc(scoreId).get();
    const score = scoreRes.data;

    // 验证权限：本人或组团管理员可修改
    if (score.userId !== userId) {
      // 非本人，检查是否为该组团的管理员
      const groupRes = await db.collection('groups').doc(score.groupId).get();
      if (groupRes.data.adminId !== userId) {
        return { code: -1, msg: '只有本人或管理员可以修改分数' };
      }
    }

    // 验证对局是否仍在进行中
    const matchRes = await db.collection('matches').doc(score.matchId).get();
    if (matchRes.data.status !== 'active') {
      return { code: -1, msg: '对局已结束，无法修改分数' };
    }

    // 更新分数
    await db.collection('scores').doc(scoreId).update({
      data: {
        finalChips: chips,
        updatedAt: db.serverDate(),
      },
    });

    return { code: 0 };
  } catch (err) {
    console.error('saveScore error:', err);
    return { code: -1, msg: err.message };
  }
};

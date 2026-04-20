// cloudfunctions/saveScore/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

/**
 * 保存/更新分数记录云函数
 * 仅允许用户修改自己的分数记录
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;
  const { scoreId, finalChips } = event;

  if (!scoreId) {
    return { code: -1, msg: 'scoreId 不能为空' };
  }

  if (finalChips === null || finalChips === undefined || isNaN(Number(finalChips))) {
    return { code: -1, msg: '结算筹码不能为空' };
  }

  const chips = Number(finalChips);
  if (chips < 0) {
    return { code: -1, msg: '结算筹码不能为负数' };
  }

  try {
    // 获取分数记录
    const scoreRes = await db.collection('scores').doc(scoreId).get();
    const score = scoreRes.data;

    // 验证是否为本人记录
    if (score.userId !== userId) {
      return { code: -1, msg: '只能修改自己的分数记录' };
    }

    // 验证赛程是否仍在进行中
    const matchRes = await db.collection('matches').doc(score.matchId).get();
    if (matchRes.data.status !== 'active') {
      return { code: -1, msg: '赛程已结束，无法修改分数' };
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

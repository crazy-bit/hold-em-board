// cloudfunctions/cancelMatch/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: 'cloud1-d1goy6u8nf336912a' });

const db = cloud.database();

/**
 * 销毁对局云函数
 * 将对局状态改为 cancelled，分数不计入总积分
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const adminId = wxContext.OPENID;
  const { matchId } = event;

  if (!matchId) {
    return { code: -1, msg: 'matchId 不能为空' };
  }

  try {
    // 获取对局信息
    const matchRes = await db.collection('matches').doc(matchId).get();
    const match = matchRes.data;

    if (match.status === 'cancelled') {
      return { code: -1, msg: '对局已作废' };
    }

    // 验证管理员权限
    const groupRes = await db.collection('groups').doc(match.groupId).get();
    if (groupRes.data.adminId !== adminId) {
      return { code: -1, msg: '只有管理员才能销毁对局' };
    }

    // 更新对局状态为 cancelled
    await db.collection('matches').doc(matchId).update({
      data: {
        status: 'cancelled',
        cancelledAt: db.serverDate(),
      },
    });

    // 删除该对局的所有 scores 记录，防止残留数据影响后续对局
    const { data: scoresData } = await db.collection('scores').where({ matchId }).get();
    if (scoresData.length > 0) {
      await Promise.all(scoresData.map(s => db.collection('scores').doc(s._id).remove()));
    }

    return { code: 0 };
  } catch (err) {
    console.error('cancelMatch error:', err);
    return { code: -1, msg: err.message };
  }
};

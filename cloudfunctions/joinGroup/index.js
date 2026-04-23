// cloudfunctions/joinGroup/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: 'cloud1-d1goy6u8nf336912a' });

const db = cloud.database();

/**
 * 加入赛事云函数
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const userId = wxContext.OPENID;
  const { inviteCode, nickName, avatarUrl } = event;

  if (!inviteCode) {
    return { code: -1, msg: '邀请码不能为空' };
  }

  try {
    // 查找赛事
    const { data: groups } = await db.collection('groups')
      .where({ inviteCode: inviteCode.toUpperCase() })
      .get();

    if (groups.length === 0) {
      return { code: -1, msg: '邀请码无效，请检查后重试' };
    }

    const group = groups[0];
    const groupId = group._id;

    // 检查是否已加入
    const { data: existing } = await db.collection('group_members')
      .where({ groupId, userId })
      .get();

    if (existing.length > 0) {
      // 已加入，直接返回成功
      return { code: 0, groupId, groupName: group.name, alreadyJoined: true };
    }

    // 加入组
    await db.collection('group_members').add({
      data: {
        groupId,
        userId,
        nickName: nickName || '德州玩家',
        avatarUrl: avatarUrl || '',
        isAdmin: false,
        joinedAt: db.serverDate(),
      },
    });

    return { code: 0, groupId, groupName: group.name, alreadyJoined: false };
  } catch (err) {
    console.error('joinGroup error:', err);
    return { code: -1, msg: err.message };
  }
};

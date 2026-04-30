// cloudfunctions/syncMemberInfo/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: 'cloud1-d1goy6u8nf336912a' });

const db = cloud.database();

/**
 * 异步同步 group_members 中的昵称和头像
 * 从 login 云函数中拆分出来，避免阻塞登录流程
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  const nickName = event.nickName;
  const avatarUrl = event.avatarUrl || '';

  if (!openId || !nickName || nickName === '德州玩家') {
    return { code: 0, msg: '无需同步' };
  }

  try {
    const { data: memberRecords } = await db.collection('group_members')
      .where({ userId: openId })
      .get();

    const updatePromises = memberRecords
      .filter(m => m.nickName !== nickName || m.avatarUrl !== avatarUrl)
      .map(m => db.collection('group_members').doc(m._id).update({
        data: { nickName, avatarUrl },
      }));

    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }

    return { code: 0, updated: updatePromises.length };
  } catch (err) {
    console.error('syncMemberInfo error:', err);
    return { code: -1, msg: err.message };
  }
};

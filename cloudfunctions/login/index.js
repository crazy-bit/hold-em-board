// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const db = cloud.database();

/**
 * 微信登录云函数
 * 获取用户 openId，首次登录自动注册
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  if (!openId) {
    return { code: -1, msg: '获取 openId 失败' };
  }

  try {
    // 查询用户是否已存在
    const usersCol = db.collection('users');
    const { data: users } = await usersCol.where({ _id: openId }).get();

    if (users.length === 0) {
      // 首次登录，创建用户记录
      await usersCol.add({
        data: {
          _id: openId,
          nickName: event.nickName || '德州玩家',
          avatarUrl: event.avatarUrl || '',
          createdAt: db.serverDate(),
        },
      });
    } else {
      // 更新昵称和头像
      if (event.nickName) {
        await usersCol.doc(openId).update({
          data: {
            nickName: event.nickName,
            avatarUrl: event.avatarUrl || '',
            updatedAt: db.serverDate(),
          },
        });
      }
    }

    return {
      code: 0,
      openId,
      nickName: event.nickName || (users[0] && users[0].nickName) || '德州玩家',
      avatarUrl: event.avatarUrl || (users[0] && users[0].avatarUrl) || '',
    };
  } catch (err) {
    console.error('login error:', err);
    return { code: -1, msg: err.message };
  }
};

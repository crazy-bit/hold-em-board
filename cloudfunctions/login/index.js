// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: 'cloud1-d1goy6u8nf336912a' });

const db = cloud.database();

/**
 * 微信登录云函数
 * 获取用户 openId，首次登录自动注册
 */
exports.main = async (event, context) => {
  const t0 = Date.now();
  console.log('[login] 开始执行');
  const wxContext = cloud.getWXContext();
  const openId = wxContext.OPENID;

  if (!openId) {
    return { code: -1, msg: '获取 openId 失败' };
  }

  try {
    const usersCol = db.collection('users');
    let existingUser = null;

    // 查询用户是否已存在（集合不存在时也能容错）
    try {
      const { data: users } = await usersCol.where({ _id: openId }).get();
      existingUser = users && users.length > 0 ? users[0] : null;
      console.log('[login] 查询用户完成', Date.now() - t0, 'ms, 存在:', !!existingUser);
    } catch (queryErr) {
      // 集合不存在或查询失败，视为新用户
      console.warn('query users failed, treat as new user:', queryErr.message);
    }

    if (!existingUser) {
      // 首次登录，创建用户记录
      try {
        await usersCol.add({
          data: {
            _id: openId,
            nickName: event.nickName || '德州玩家',
            avatarUrl: event.avatarUrl || '',
            createdAt: db.serverDate(),
          },
        });
      } catch (addErr) {
        // 并发情况下可能已被创建，忽略重复插入错误
        console.warn('add user failed (may already exist):', addErr.message);
      }
    } else if (event.nickName) {
      // 更新昵称和头像
      try {
        await usersCol.doc(openId).update({
          data: {
            nickName: event.nickName,
            avatarUrl: event.avatarUrl || '',
            updatedAt: db.serverDate(),
          },
        });
      } catch (updateErr) {
        console.warn('update user failed:', updateErr.message);
      }
    }

    // 注意：group_members 昵称同步已移至登录页提交时异步处理，不在此阻塞登录流程

    console.log('[login] 完成，总耗时', Date.now() - t0, 'ms');

    return {
      code: 0,
      openId,
      nickName: event.nickName || (existingUser && existingUser.nickName) || '德州玩家',
      avatarUrl: event.avatarUrl || (existingUser && existingUser.avatarUrl) || '',
    };
  } catch (err) {
    console.error('login error:', err);
    return { code: -1, msg: err.message };
  }
};

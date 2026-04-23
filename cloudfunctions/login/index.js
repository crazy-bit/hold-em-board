// cloudfunctions/login/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: 'cloud1-d1goy6u8nf336912a' });

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
    const usersCol = db.collection('users');
    let existingUser = null;

    // 查询用户是否已存在（集合不存在时也能容错）
    try {
      const { data: users } = await usersCol.where({ _id: openId }).get();
      existingUser = users && users.length > 0 ? users[0] : null;
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

    // 同步更新 group_members 中的昵称和头像
    const finalNickName = event.nickName || (existingUser && existingUser.nickName) || '德州玩家';
    const finalAvatarUrl = event.avatarUrl || (existingUser && existingUser.avatarUrl) || '';
    if (finalNickName !== '德州玩家') {
      try {
        const { data: memberRecords } = await db.collection('group_members')
          .where({ userId: openId })
          .get();
        const updatePromises = memberRecords
          .filter(m => m.nickName !== finalNickName || m.avatarUrl !== finalAvatarUrl)
          .map(m => db.collection('group_members').doc(m._id).update({
            data: { nickName: finalNickName, avatarUrl: finalAvatarUrl },
          }));
        if (updatePromises.length > 0) await Promise.all(updatePromises);
      } catch (syncErr) {
        console.warn('sync group_members nickName failed:', syncErr.message);
      }
    }

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

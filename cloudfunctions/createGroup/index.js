// cloudfunctions/createGroup/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: 'cloud1-d1goy6u8nf336912a' });

const db = cloud.database();

/**
 * 创建组团云函数
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const adminId = wxContext.OPENID;
  const { name, nickName, avatarUrl } = event;

  if (!name || !name.trim()) {
    return { code: -1, msg: '组团名称不能为空' };
  }

  try {
    // 生成唯一邀请码
    const inviteCode = await generateUniqueInviteCode();

    // 默认规则：所有人初始积分 1000，无额外加成
    const defaultChipRules = [
      { rank: 0, initialChips: 1000, bonus: 0 },
    ];

    // 创建组团
    const groupRes = await db.collection('groups').add({
      data: {
        name: name.trim(),
        adminId,
        inviteCode,
        chipRules: defaultChipRules,
        bonusCountsToTotal: false,
        createdAt: db.serverDate(),
      },
    });

    const groupId = groupRes._id;

    // 将创建者加入组成员
    await db.collection('group_members').add({
      data: {
        groupId,
        userId: adminId,
        nickName: nickName || '德州玩家',
        avatarUrl: avatarUrl || '',
        isAdmin: true,
        joinedAt: db.serverDate(),
      },
    });

    return { code: 0, groupId, inviteCode };
  } catch (err) {
    console.error('createGroup error:', err);
    return { code: -1, msg: err.message };
  }
};

/**
 * 生成唯一邀请码
 */
async function generateUniqueInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  let isUnique = false;

  while (!isUnique) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    // 检查是否已存在
    const { data } = await db.collection('groups').where({ inviteCode: code }).get();
    if (data.length === 0) {
      isUnique = true;
    }
  }

  return code;
}

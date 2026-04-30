// cloudfunctions/saveRules/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: 'cloud1-d1goy6u8nf336912a' });

const db = cloud.database();

/**
 * 保存积分规则云函数
 * 仅管理员可操作
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext();
  const adminId = wxContext.OPENID;
  const { groupId, chipRules, bonusCountsToTotal, initialChips } = event;

  if (!groupId) {
    return { code: -1, msg: 'groupId 不能为空' };
  }

  try {
    // 验证管理员权限
    const groupRes = await db.collection('groups').doc(groupId).get();
    if (groupRes.data.adminId !== adminId) {
      return { code: -1, msg: '只有管理员才能修改规则' };
    }

    // 验证规则格式
    if (!Array.isArray(chipRules) || chipRules.length === 0) {
      return { code: -1, msg: '规则配置不能为空' };
    }

    // 确保有默认规则（rank=0）
    const hasDefault = chipRules.some(r => r.rank === 0);
    if (!hasDefault) {
      return { code: -1, msg: '必须包含默认规则（名次=0）' };
    }

    // 统一初始积分：将所有名次的 initialChips 设为相同值（从 rank=0 或前端传入的 initialChips 获取）
    const unifiedInitialChips = initialChips !== undefined
      ? Number(initialChips) || 0
      : (chipRules.find(r => r.rank === 0) || {}).initialChips || 1000;

    const normalizedRules = chipRules.map(r => ({
      ...r,
      initialChips: unifiedInitialChips,
    }));

    // 保存规则
    await db.collection('groups').doc(groupId).update({
      data: {
        chipRules: normalizedRules,
        bonusCountsToTotal: !!bonusCountsToTotal,
        updatedAt: db.serverDate(),
      },
    });

    return { code: 0 };
  } catch (err) {
    console.error('saveRules error:', err);
    return { code: -1, msg: err.message };
  }
};

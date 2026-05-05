/**
 * utils/util.js - 通用工具函数
 */

/**
 * 格式化日期
 * @param {Date|string} date
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hour = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${min}`;
}

/**
 * 生成唯一邀请码（6位大写字母+数字）
 * @returns {string}
 */
function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/**
 * 显示 toast 提示
 * @param {string} title
 * @param {string} icon
 */
function showToast(title, icon = 'none') {
  wx.showToast({ title, icon, duration: 2000 });
}

/**
 * 显示错误提示
 * @param {string} msg
 */
function showError(msg) {
  wx.showToast({ title: msg || '操作失败', icon: 'error', duration: 2000 });
}

/**
 * 显示加载中
 * @param {string} title
 */
function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true });
}

/**
 * 隐藏加载中
 */
function hideLoading() {
  wx.hideLoading();
}

/**
 * 计算本期积分（用于对局详情展示，含 bonus）
 * @param {number} finalChips 结算积分（已包含 bonus）
 * @param {number} initialChips 初始积分
 * @returns {number} 本期积分
 */
function calcRoundPoints(finalChips, initialChips) {
  return (finalChips || 0) - (initialChips || 0);
}

/**
 * 计算计入总积分的值（受 bonusCountsToTotal 控制）
 * @param {number} finalChips 结算积分（已包含 bonus）
 * @param {number} initialChips 初始积分
 * @param {number} bonus 额外加成
 * @param {boolean} bonusCountsToTotal 额外加成是否计入总积分
 * @returns {number} 计入总积分的本期值
 */
function calcPoints(finalChips, initialChips, bonus, bonusCountsToTotal) {
  const round = calcRoundPoints(finalChips, initialChips);
  // 勾选时：bonus 也计入总积分，直接用本期积分
  // 不勾选时：剔除 bonus，只计实际输赢
  return round - (bonusCountsToTotal ? 0 : (bonus || 0));
}

/**
 * 根据总积分排名获取规则
 * @param {Array} chipRules 规则数组
 * @param {number} rank 当前排名（1-based，0表示未上榜）
 * @returns {{ initialChips: number, bonus: number }}
 */
function getRuleByRank(chipRules, rank) {
  if (!chipRules || chipRules.length === 0) {
    return { initialChips: 1000, bonus: 0 };
  }
  // 查找精确匹配的名次规则
  const matched = chipRules.find(r => r.rank === rank);
  if (matched) return matched;
  // 回退到默认规则（rank=0）
  const defaultRule = chipRules.find(r => r.rank === 0);
  return defaultRule || { initialChips: 1000, bonus: 0 };
}

module.exports = {
  formatDate,
  generateInviteCode,
  showToast,
  showError,
  showLoading,
  hideLoading,
  calcPoints,
  calcRoundPoints,
  getRuleByRank,
};

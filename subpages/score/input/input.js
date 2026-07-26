// pages/score/input/input.js
const app = getApp();
let Toast;
try { Toast = require('tdesign-miniprogram/toast/index'); } catch(e) { Toast = null; }
function showToast(opts) {
  if (typeof Toast === 'function') {
    Toast(opts);
  } else {
    wx.showToast({ title: opts.message || '', icon: opts.theme === 'success' ? 'success' : 'none', duration: 2000 });
  }
}
Page({
  data: {
    scoreId: '',
    matchId: '',
    groupId: '',
    score: {},
    finalChips: '',
    previewPoints: 0,
    saving: false,
    bonusCountsToTotal: false,
    isSelf: false,
    isAdmin: false,
    canEdit: false,
    identityReady: false,
    isFillingForOther: false,
    targetNickName: '',
  },

  onLoad(options) {
    this.setData({ scoreId: options.scoreId, matchId: options.matchId, groupId: options.groupId || '' });
    this.loadScore();
  },

  async ensureOpenId() {
    if (app.globalData.openId) return app.globalData.openId;

    const res = await wx.cloud.callFunction({ name: 'login', data: {} });
    if (!res.result || res.result.code !== 0 || !res.result.openId) {
      throw new Error((res.result && res.result.msg) || '获取登录身份失败');
    }

    const { openId, nickName, avatarUrl } = res.result;
    app.globalData.openId = openId;
    app.globalData.userInfo = { openId, nickName, avatarUrl };
    return openId;
  },

  async loadScore() {
    const { scoreId } = this.data;
    const db = wx.cloud.database();

    try {
      const openId = await this.ensureOpenId();
      const scoreRes = await db.collection('scores').doc(scoreId).get();
      const score = scoreRes.data;
      if (!score || !score.groupId) throw new Error('分数记录不存在');

      // 权限关联以分数记录中的 groupId 为准，不信任页面参数。
      const groupRes = await db.collection('groups').doc(score.groupId).get();
      const group = groupRes.data;
      if (!group) throw new Error('记分组不存在');

      const isSelf = score.userId === openId;
      const isAdmin = group.adminId === openId;
      const canEdit = isSelf || isAdmin;
      const isFillingForOther = isAdmin && !isSelf;

      this.setData({
        groupId: score.groupId,
        score,
        bonusCountsToTotal: group.bonusCountsToTotal || false,
        isSelf,
        isAdmin,
        canEdit,
        identityReady: true,
        isFillingForOther,
        targetNickName: isFillingForOther ? (score.nickName || '其他成员') : '',
        finalChips: score.finalChips !== null && score.finalChips !== undefined
          ? String(score.finalChips)
          : '',
      });

      if (score.finalChips !== null && score.finalChips !== undefined) {
        this.calcPreview(score.finalChips);
      }
    } catch (err) {
      this.setData({ identityReady: false, canEdit: false, isFillingForOther: false });
      showToast({ context: this, selector: '#t-toast', message: err.message || '加载失败', theme: 'error' });
    }
  },

  toggleSign() {
    let val = this.data.finalChips;
    if (val === '' || val === '0') return;
    if (val.startsWith('-')) {
      val = val.slice(1);
    } else {
      val = '-' + val;
    }
    this.setData({ finalChips: val });
    this.calcPreview(Number(val));
  },

  onChipsInput(e) {
    const val = e.detail.value;
    this.setData({ finalChips: val });
    // 允许中间输入状态："-" 或 "-." 等，不立即 preview
    if (val !== '' && val !== '-' && val !== '.' && val !== '-.') {
      this.calcPreview(Number(val));
    }
  },

  calcPreview(finalChips) {
    const { score } = this.data;
    // 本期积分预览 = finalChips - initialChips（含 bonus，与对局详情展示一致）
    const points = finalChips - (score.initialChips || 0);
    this.setData({ previewPoints: points });
  },

  async saveScore() {
    const { scoreId, finalChips, canEdit } = this.data;
    if (!canEdit) {
      showToast({ context: this, selector: '#t-toast', message: '只有本人或管理员可以修改分数', theme: 'warning' });
      return;
    }
    if (finalChips === '' || isNaN(Number(finalChips))) return;

    this.setData({ saving: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'saveScore',
        data: { scoreId, finalChips: Number(finalChips) },
      });

      if (res.result.code === 0) {
        showToast({ context: this, selector: '#t-toast', message: '保存成功', theme: 'success' });
        setTimeout(() => wx.navigateBack(), 800);
      } else {
        showToast({ context: this, selector: '#t-toast', message: res.result.msg || '保存失败', theme: 'error' });
      }
    } catch (err) {
      showToast({ context: this, selector: '#t-toast', message: '保存失败，请重试', theme: 'error' });
    } finally {
      this.setData({ saving: false });
    }
  },
});

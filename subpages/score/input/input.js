// pages/score/input/input.js
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
  },

  onLoad(options) {
    this.setData({ scoreId: options.scoreId, matchId: options.matchId, groupId: options.groupId || '' });
    this.loadScore();
  },

  async loadScore() {
    const { scoreId, groupId } = this.data;
    const db = wx.cloud.database();

    try {
      // 并行查询分数记录和赛事规则
      const queries = [db.collection('scores').doc(scoreId).get()];
      if (groupId) {
        queries.push(db.collection('groups').doc(groupId).get());
      }
      const results = await Promise.all(queries);

      const score = results[0].data;
      const bonusCountsToTotal = results[1] ? (results[1].data.bonusCountsToTotal || false) : false;

      this.setData({
        score,
        bonusCountsToTotal,
        finalChips: score.finalChips !== null && score.finalChips !== undefined
          ? String(score.finalChips)
          : '',
      });

      if (score.finalChips !== null && score.finalChips !== undefined) {
        this.calcPreview(score.finalChips);
      }
    } catch (err) {
      showToast({ context: this, selector: '#t-toast', message: '加载失败', theme: 'error' });
    }
  },

  onChipsInput(e) {
    const val = e.detail;
    this.setData({ finalChips: val });
    if (val !== '') {
      this.calcPreview(Number(val));
    }
  },

  calcPreview(finalChips) {
    const { score, bonusCountsToTotal } = this.data;
    const base = finalChips - (score.initialChips || 0);
    const points = bonusCountsToTotal ? base + (score.bonus || 0) : base;
    this.setData({ previewPoints: points });
  },

  async saveScore() {
    const { scoreId, finalChips } = this.data;
    if (finalChips === '') return;

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

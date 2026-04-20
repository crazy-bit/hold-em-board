// pages/score/input/input.js
Page({
  data: {
    scoreId: '',
    matchId: '',
    score: {},
    finalChips: '',
    previewPoints: 0,
    saving: false,
    bonusCountsToTotal: false,
  },

  onLoad(options) {
    this.setData({ scoreId: options.scoreId, matchId: options.matchId });
    this.loadScore();
  },

  async loadScore() {
    const { scoreId, matchId } = this.data;
    const db = wx.cloud.database();

    try {
      const [scoreRes, matchRes] = await Promise.all([
        db.collection('scores').doc(scoreId).get(),
        db.collection('matches').doc(matchId).get(),
      ]);

      const score = scoreRes.data;
      const match = matchRes.data;
      const bonusCountsToTotal = match.rulesSnapshot && match.rulesSnapshot.bonusCountsToTotal;

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
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },

  onChipsInput(e) {
    const val = e.detail.value;
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
        wx.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 800);
      } else {
        wx.showToast({ title: res.result.msg || '保存失败', icon: 'error' });
      }
    } catch (err) {
      wx.showToast({ title: '保存失败，请重试', icon: 'error' });
    } finally {
      this.setData({ saving: false });
    }
  },
});

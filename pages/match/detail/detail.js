// pages/match/detail/detail.js
const app = getApp();
const { formatDate } = require('../../../utils/util');

Page({
  data: {
    matchId: '',
    groupId: '',
    match: {},
    scores: [],
    isAdmin: false,
    unfilledCount: 0,
    showFinishModal: false,
    unfilledMembers: [],
    finishing: false,
  },

  onLoad(options) {
    this.setData({ matchId: options.id, groupId: options.groupId });
    this.loadData();
  },

  onShow() {
    if (this.data.matchId) {
      this.loadData();
    }
  },

  async loadData() {
    const { matchId, groupId } = this.data;
    const openId = app.globalData.openId;
    const db = wx.cloud.database();

    try {
      const [matchRes, scoresRes, groupRes] = await Promise.all([
        db.collection('matches').doc(matchId).get(),
        db.collection('scores').where({ matchId }).get(),
        db.collection('groups').doc(groupId).get(),
      ]);

      const match = {
        ...matchRes.data,
        createdAtStr: formatDate(matchRes.data.createdAt),
      };

      const isAdmin = groupRes.data.adminId === openId;

      const scores = scoresRes.data.map(s => ({
        ...s,
        isSelf: s.userId === openId,
      }));

      const unfilledCount = scores.filter(s => s.finalChips === null || s.finalChips === undefined).length;

      this.setData({ match, scores, isAdmin, unfilledCount });
    } catch (err) {
      console.error('loadData error:', err);
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },

  goInputScore(e) {
    const { match } = this.data;
    if (match.status !== 'active') return;

    const openId = app.globalData.openId;
    const userId = e.currentTarget.dataset.userid;
    const scoreId = e.currentTarget.dataset.scoreid;

    // 只能填写自己的分数
    if (userId !== openId) {
      wx.showToast({ title: '只能填写自己的分数', icon: 'none' });
      return;
    }

    wx.navigateTo({
      url: `/pages/score/input/input?scoreId=${scoreId}&matchId=${this.data.matchId}`,
    });
  },

  async finishMatch() {
    const { matchId, scores } = this.data;
    const unfilled = scores.filter(s => s.finalChips === null || s.finalChips === undefined);

    this.setData({
      showFinishModal: true,
      unfilledMembers: unfilled.map(s => s.nickName),
    });
  },

  closeFinishModal() {
    this.setData({ showFinishModal: false });
  },

  async confirmFinish() {
    this.setData({ finishing: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'finishMatch',
        data: { matchId: this.data.matchId, force: true },
      });

      if (res.result.code === 0) {
        this.setData({ showFinishModal: false });
        wx.showToast({ title: '赛程已结束', icon: 'success' });
        this.loadData();
      } else {
        wx.showToast({ title: res.result.msg || '操作失败', icon: 'error' });
      }
    } catch (err) {
      wx.showToast({ title: '操作失败，请重试', icon: 'error' });
    } finally {
      this.setData({ finishing: false });
    }
  },

  cancelMatch() {
    wx.showModal({
      title: '确认销毁赛程？',
      content: '销毁后赛程将作废，分数不计入总积分，此操作不可撤销',
      confirmColor: '#ff4d4f',
      confirmText: '确认销毁',
      success: async (res) => {
        if (res.confirm) {
          try {
            const result = await wx.cloud.callFunction({
              name: 'cancelMatch',
              data: { matchId: this.data.matchId },
            });
            if (result.result.code === 0) {
              wx.showToast({ title: '赛程已作废', icon: 'success' });
              this.loadData();
            } else {
              wx.showToast({ title: result.result.msg || '操作失败', icon: 'error' });
            }
          } catch (err) {
            wx.showToast({ title: '操作失败，请重试', icon: 'error' });
          }
        }
      },
    });
  },
});

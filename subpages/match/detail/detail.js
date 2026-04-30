// pages/match/detail/detail.js
const app = getApp();
const { formatDate } = require('../../utils/util');
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
    if (this.data.matchId && !this._loading) {
      this.loadData();
    }
  },

  async loadData() {
    if (this._loading) return;
    this._loading = true;
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
      showToast({ context: this, selector: '#t-toast', message: '加载失败', theme: 'error' });
    } finally {
      this._loading = false;
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
      showToast({ context: this, selector: '#t-toast', message: '只能填写自己的分数', theme: 'warning' });
      return;
    }

    wx.navigateTo({
      url: `/subpages/score/input/input?scoreId=${scoreId}&matchId=${this.data.matchId}&groupId=${this.data.groupId}`,
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
        showToast({ context: this, selector: '#t-toast', message: '对局已结束', theme: 'success' });
        this.loadData();
      } else {
        showToast({ context: this, selector: '#t-toast', message: res.result.msg || '操作失败', theme: 'error' });
      }
    } catch (err) {
      showToast({ context: this, selector: '#t-toast', message: '操作失败，请重试', theme: 'error' });
    } finally {
      this.setData({ finishing: false });
    }
  },

  cancelMatch() {
    wx.showModal({
      title: '确认销毁对局？',
      content: '销毁后对局将作废，分数不计入总积分，此操作不可撤销',
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
              showToast({ context: this, selector: '#t-toast', message: '对局已作废', theme: 'success' });
              this.loadData();
            } else {
              showToast({ context: this, selector: '#t-toast', message: result.result.msg || '操作失败', theme: 'error' });
            }
          } catch (err) {
            showToast({ context: this, selector: '#t-toast', message: '操作失败，请重试', theme: 'error' });
          }
        }
      },
    });
  },
});

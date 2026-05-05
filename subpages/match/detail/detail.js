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

    // 若 openId 尚未就绪（如直接从分享链接进入），先完成登录
    if (!app.globalData.openId) {
      try {
        const res = await wx.cloud.callFunction({ name: 'login', data: {} });
        if (res.result && res.result.code === 0 && res.result.nickName && res.result.nickName !== '德州玩家') {
          app.globalData.openId = res.result.openId;
          app.globalData.userInfo = {
            openId: res.result.openId,
            nickName: res.result.nickName,
            avatarUrl: res.result.avatarUrl,
          };
        }
      } catch (e) {
        console.warn('[match/detail] 登录获取 openId 失败:', e);
      }
    }

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

      // 查询该 group 下所有已完成对局的积分，用于计算每人总积分
      const { data: allFinishedScores } = await db.collection('scores')
        .where({ groupId, points: db.command.neq(null) })
        .limit(1000)
        .get();

      // 按 userId 累加总积分
      const totalPointsMap = {};
      allFinishedScores.forEach(s => {
        totalPointsMap[s.userId] = (totalPointsMap[s.userId] || 0) + (s.points || 0);
      });

      const rawScores = scoresRes.data.map(s => ({
        ...s,
        isSelf: s.userId === openId,
        // 兼容存量数据：若无 roundPoints 字段，用 finalChips - initialChips 兜底
        roundPoints: (s.roundPoints !== null && s.roundPoints !== undefined)
          ? s.roundPoints
          : (s.finalChips !== null && s.finalChips !== undefined ? s.finalChips - (s.initialChips || 0) : null),
        // 历史总积分（含本局已结算的 points）
        totalPoints: totalPointsMap[s.userId] !== undefined ? totalPointsMap[s.userId] : null,
      }));

      // 按积分降序排序：已有积分的排前面，未填写的排后面
      const filled = rawScores.filter(s => s.points !== null && s.points !== undefined)
        .sort((a, b) => b.points - a.points);
      const unfilled = rawScores.filter(s => s.points === null || s.points === undefined);

      // 加上排名序号（只给已填写积分的成员）
      let rank = 1;
      filled.forEach((s, i) => {
        if (i > 0 && s.points === filled[i - 1].points) {
          s.rank = filled[i - 1].rank; // 同分同名次
        } else {
          s.rank = rank;
        }
        rank++;
      });
      unfilled.forEach(s => { s.rank = null; });

      const scores = [...filled, ...unfilled];
      const unfilledCount = unfilled.length;

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

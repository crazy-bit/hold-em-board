// pages/member/detail/detail.js
const { formatDate } = require('../../utils/util');

Page({
  data: {
    userId: '',
    groupId: '',
    memberInfo: {},
    scores: [],
    totalPoints: 0,
  },

  onLoad(options) {
    this.setData({ userId: options.userId, groupId: options.groupId });
    this.loadData();
  },

  async loadData() {
    const { userId, groupId } = this.data;
    const db = wx.cloud.database();

    try {
      // 获取成员信息
      const memberRes = await db.collection('group_members')
        .where({ groupId, userId })
        .get();

      const memberInfo = memberRes.data[0] || { nickName: '未知成员' };

      // 获取该成员在该组的所有分数记录
      const scoresRes = await db.collection('scores')
        .where({ groupId, userId })
        .orderBy('updatedAt', 'desc')
        .get();

      // 获取对应对局信息
      const matchIds = [...new Set(scoresRes.data.map(s => s.matchId))];
      let matchMap = {};

      if (matchIds.length > 0) {
        const matchesRes = await db.collection('matches')
          .where({ _id: db.command.in(matchIds) })
          .get();
        matchesRes.data.forEach(m => { matchMap[m._id] = m; });
      }

      // 只统计已完成对局的积分，按对局时间倒排
      let totalPoints = 0;
      const scores = scoresRes.data
        .filter(s => {
          const match = matchMap[s.matchId];
          return match && match.status !== 'cancelled';
        })
        .map(s => {
          const match = matchMap[s.matchId] || {};
          if (match.status === 'finished' && s.points !== null) {
            totalPoints += s.points || 0;
          }
          return {
            ...s,
            matchTitle: match.title || '对局',
            matchDateStr: formatDate(match.createdAt),
            matchStatus: match.status,
            matchCreatedAt: match.createdAt ? new Date(match.createdAt).getTime() : 0,
            // 兼容存量数据：若无 roundPoints 字段，用 finalChips - initialChips 兜底
            roundPoints: (s.roundPoints !== null && s.roundPoints !== undefined)
              ? s.roundPoints
              : (s.finalChips !== null && s.finalChips !== undefined ? s.finalChips - (s.initialChips || 0) : null),
          };
        })
        .sort((a, b) => b.matchCreatedAt - a.matchCreatedAt);

      this.setData({ memberInfo, scores, totalPoints });
    } catch (err) {
      console.error('loadData error:', err);
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },
});

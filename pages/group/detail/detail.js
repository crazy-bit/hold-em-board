// pages/group/detail/detail.js
const app = getApp();
const { formatDate, calcPoints } = require('../../../utils/util');

Page({
  data: {
    groupId: '',
    group: {},
    members: [],
    matches: [],
    leaderboard: [],
    isAdmin: false,
    activeTab: 'matches',
    loading: true,
  },

  onLoad(options) {
    this.setData({ groupId: options.id });
    this.loadData();
  },

  onShow() {
    if (this.data.groupId) {
      this.loadData();
    }
  },

  async loadData() {
    const { groupId } = this.data;
    const openId = app.globalData.openId;
    const db = wx.cloud.database();

    try {
      // 并行加载组信息、成员、赛程
      const [groupRes, membersRes, matchesRes] = await Promise.all([
        db.collection('groups').doc(groupId).get(),
        db.collection('group_members').where({ groupId }).orderBy('joinedAt', 'asc').get(),
        db.collection('matches').where({ groupId }).orderBy('createdAt', 'desc').get(),
      ]);

      const group = groupRes.data;
      const members = membersRes.data;
      const matches = matchesRes.data.map((m, i) => ({
        ...m,
        index: matchesRes.data.length - i,
        createdAtStr: formatDate(m.createdAt),
      }));

      const isAdmin = group.adminId === openId;

      this.setData({ group, members, matches, isAdmin, loading: false });

      // 计算总积分榜
      this.calcLeaderboard(members, matches, group);
    } catch (err) {
      console.error('loadData error:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'error' });
    }
  },

  async calcLeaderboard(members, matches, group) {
    const db = wx.cloud.database();
    const finishedMatches = matches.filter(m => m.status === 'finished');

    if (finishedMatches.length === 0) {
      const leaderboard = members.map(m => ({
        userId: m.userId,
        nickName: m.nickName,
        totalPoints: 0,
        matchCount: 0,
      }));
      this.setData({ leaderboard });
      return;
    }

    // 查询所有已完成赛程的分数
    const matchIds = finishedMatches.map(m => m._id);
    const { data: scores } = await db.collection('scores')
      .where({ matchId: db.command.in(matchIds) })
      .get();

    // 按用户汇总积分
    const pointsMap = {};
    const countMap = {};
    scores.forEach(s => {
      if (!pointsMap[s.userId]) {
        pointsMap[s.userId] = 0;
        countMap[s.userId] = 0;
      }
      pointsMap[s.userId] += s.points || 0;
      countMap[s.userId]++;
    });

    const leaderboard = members.map(m => ({
      userId: m.userId,
      nickName: m.nickName,
      totalPoints: pointsMap[m.userId] || 0,
      matchCount: countMap[m.userId] || 0,
    })).sort((a, b) => b.totalPoints - a.totalPoints);

    this.setData({ leaderboard });
  },

  switchTab(e) {
    this.setData({ activeTab: e.currentTarget.dataset.tab });
  },

  createMatch() {
    wx.navigateTo({ url: `/pages/match/create/create?groupId=${this.data.groupId}` });
  },

  goMatchDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/match/detail/detail?id=${id}&groupId=${this.data.groupId}` });
  },

  goMemberDetail(e) {
    const userId = e.currentTarget.dataset.userid;
    wx.navigateTo({ url: `/pages/member/detail/detail?userId=${userId}&groupId=${this.data.groupId}` });
  },

  goRules() {
    wx.navigateTo({ url: `/pages/rules/edit/edit?groupId=${this.data.groupId}` });
  },

  shareGroup() {
    const { group } = this.data;
    wx.showActionSheet({
      itemList: ['复制邀请码', '分享给好友'],
      success: (res) => {
        if (res.tapIndex === 0) {
          wx.setClipboardData({
            data: group.inviteCode,
            success: () => wx.showToast({ title: '邀请码已复制', icon: 'success' }),
          });
        } else if (res.tapIndex === 1) {
          // 触发页面分享
          wx.showToast({ title: '请点击右上角分享', icon: 'none' });
        }
      },
    });
  },

  onShareAppMessage() {
    const { group } = this.data;
    return {
      title: `加入「${group.name}」德州记分组`,
      path: `/pages/group/list/list?inviteCode=${group.inviteCode}`,
    };
  },
});

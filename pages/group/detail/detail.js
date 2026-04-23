// pages/group/detail/detail.js
const app = getApp();
const { formatDate, calcPoints } = require('../../../utils/util');
const Toast = require('@vant/weapp/toast/toast');

Page({
  data: {
    groupId: '',
    group: {},
    members: [],
    matches: [],
    leaderboard: [],
    trendSeries: [],
    trendLabels: [],
    isAdmin: false,
    activeTab: 'matches',
    activeTabIndex: 0,
    loading: true,
  },

  onLoad(options) {
    this.setData({ groupId: options.id });
    this.loadData();
  },

  onShow() {
    if (this.data.groupId && !this._loading) {
      this.loadData();
    }
  },

  async loadData() {
    if (this._loading) return;
    this._loading = true;
    const { groupId } = this.data;
    const openId = app.globalData.openId;
    const db = wx.cloud.database();

    try {
      // 先尝试直接查询数据库
      let group, members = [], matches = [], isAdmin = false;

      try {
        const groupRes = await db.collection('groups').doc(groupId).get();
        group = groupRes.data;
      } catch (docErr) {
        // doc().get() 失败，尝试用 where 查询（绕过 doc 的权限限制）
        console.warn('loadData: doc().get() 失败，尝试 where 查询', docErr.errCode || docErr.message);
        try {
          const { data } = await db.collection('groups').where({ _id: groupId }).get();
          if (data && data.length > 0) {
            group = data[0];
          }
        } catch (whereErr) {
          console.warn('loadData: where 查询也失败', whereErr.errCode || whereErr.message);
        }

        // 如果仍然失败，尝试通过云函数获取
        if (!group) {
          try {
            const res = await wx.cloud.callFunction({
              name: 'getGroupDetail',
              data: { groupId },
            });
            if (res.result && res.result.code === 0) {
              const result = res.result;
              const fmtMatches = (result.matches || []).map((m, i) => ({
                ...m,
                index: (result.matches || []).length - i,
                createdAtStr: formatDate(m.createdAt),
              }));
              this.setData({
                group: result.group,
                members: result.members || [],
                matches: fmtMatches,
                isAdmin: result.isAdmin || false,
                leaderboard: result.leaderboard || [],
                loading: false,
              });
              return;
            }
          } catch (cfErr) {
            // 云函数也不可用（可能未部署），最终失败
            console.error('loadData: 所有查询方式均失败');
          }

          this.setData({ loading: false });
          Toast.fail('加载失败');
          return;
        }
      }

      // 查询成员和赛程（使用 allSettled 容错）
      const [membersResult, matchesResult] = await Promise.allSettled([
        db.collection('group_members').where({ groupId }).orderBy('joinedAt', 'asc').get(),
        db.collection('matches').where({ groupId }).orderBy('createdAt', 'desc').get(),
      ]);

      if (membersResult.status === 'fulfilled') {
        members = membersResult.value.data;
      }
      if (matchesResult.status === 'fulfilled') {
        matches = matchesResult.value.data.map((m, i) => ({
          ...m,
          index: matchesResult.value.data.length - i,
          createdAtStr: formatDate(m.createdAt),
        }));
      }

      isAdmin = group.adminId === openId;
      this.setData({ group, members, matches, isAdmin, loading: false });

      // 计算总积分榜
      this.calcLeaderboard(members, matches, group);
    } catch (err) {
      const errInfo = err.errCode ? `errCode: ${err.errCode}, errMsg: ${err.errMsg}` : (err.message || JSON.stringify(err));
      console.error('loadData error:', errInfo);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'error' });
    } finally {
      this._loading = false;
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
      this.setData({ leaderboard, trendSeries: [], trendLabels: [] });
      return;
    }

    try {
      const matchIds = finishedMatches.map(m => m._id);
      const { data: scores } = await db.collection('scores')
        .where({ matchId: db.command.in(matchIds) })
        .get();

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

      // 计算积分趋势数据
      const { trendSeries, trendLabels } = this._calcTrend(finishedMatches, scores, members);

      this.setData({ leaderboard, trendSeries, trendLabels });
    } catch (err) {
      console.warn('calcLeaderboard error:', err.message || err);
    }
  },

  _calcTrend(finishedMatches, scores, members) {
    const COLORS = [
      '#e94560', '#4caf50', '#2196f3', '#ff9800', '#9c27b0',
      '#00bcd4', '#795548', '#607d8b', '#f44336', '#3f51b5',
    ];

    // 按时间升序排列
    const sorted = [...finishedMatches].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt) : 0;
      const tb = b.createdAt ? new Date(b.createdAt) : 0;
      return ta - tb;
    });

    const trendLabels = sorted.map((m, i) => m.title || `第${i + 1}期`);

    // 按 matchId 分组 scores
    const scoresByMatch = {};
    scores.forEach(s => {
      if (!scoresByMatch[s.matchId]) scoresByMatch[s.matchId] = [];
      scoresByMatch[s.matchId].push(s);
    });

    // 为每个成员计算逐期累计积分
    const cumulative = {};
    members.forEach(m => { cumulative[m.userId] = []; });

    sorted.forEach(match => {
      const matchScores = scoresByMatch[match._id] || [];
      const matchPointsMap = {};
      matchScores.forEach(s => { matchPointsMap[s.userId] = s.points || 0; });

      members.forEach(m => {
        const prev = cumulative[m.userId].length > 0
          ? cumulative[m.userId][cumulative[m.userId].length - 1]
          : 0;
        cumulative[m.userId].push(prev + (matchPointsMap[m.userId] || 0));
      });
    });

    // 构建 series（只包含有参与记录的成员）
    const trendSeries = members
      .filter(m => cumulative[m.userId].some(v => v !== 0))
      .map((m, i) => ({
        userId: m.userId,
        nickName: m.nickName,
        color: COLORS[i % COLORS.length],
        data: cumulative[m.userId],
      }));

    return { trendSeries, trendLabels };
  },

  onTabChange(e) {
    const index = e.detail.index;
    const tabs = ['matches', 'leaderboard', 'trend'];
    this.setData({ activeTab: tabs[index], activeTabIndex: index });
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
            success: () => Toast.success('邀请码已复制'),
          });
        } else if (res.tapIndex === 1) {
          // 触发页面分享
          Toast('请点击右上角分享');
        }
      },
    });
  },

  onShareAppMessage() {
    const { group } = this.data;
    return {
      title: `加入「${group.name}」德州赛事`,
      path: `/pages/group/list/list?inviteCode=${group.inviteCode}`,
    };
  },
});

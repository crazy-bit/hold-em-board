// pages/group/detail/detail.js
const app = getApp();
const { formatDate, calcPoints } = require('../../../utils/util');
const _Toast = require('@vant/weapp/toast/toast');
const Toast = _Toast.default || _Toast;

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
      let group, members = [], matches = [], isAdmin = false;

      // 优先尝试云函数（一次调用返回所有数据，最快）
      let usedCloudFn = false;
      try {
        const res = await wx.cloud.callFunction({
          name: 'getGroupDetail',
          data: { groupId },
        });
        if (res.result && res.result.code === 0) {
          const result = res.result;
          group = result.group;
          members = result.members || [];
          matches = result.matches || [];
          isAdmin = result.isAdmin || false;
          usedCloudFn = true;
        }
      } catch (cfErr) {
        console.warn('loadData: 云函数不可用，降级到直接查询');
      }

      // 降级：直接查询数据库
      if (!usedCloudFn) {
        try {
          const groupRes = await db.collection('groups').doc(groupId).get();
          group = groupRes.data;
        } catch (docErr) {
          try {
            const { data } = await db.collection('groups').where({ _id: groupId }).get();
            if (data && data.length > 0) group = data[0];
          } catch (_) {}
        }

        if (!group) {
          this.setData({ loading: false });
          Toast.fail('加载失败');
          return;
        }

        const [membersResult, matchesResult] = await Promise.allSettled([
          db.collection('group_members').where({ groupId }).orderBy('joinedAt', 'asc').get(),
          db.collection('matches').where({ groupId }).orderBy('createdAt', 'desc').get(),
        ]);

        if (membersResult.status === 'fulfilled') members = membersResult.value.data;
        if (matchesResult.status === 'fulfilled') matches = matchesResult.value.data;
        isAdmin = group.adminId === openId;

        // 尝试从 users 表获取最新昵称和头像
        try {
          const userIds = members.map(m => m.userId);
          if (userIds.length > 0) {
            const { data: users } = await db.collection('users')
              .where({ _id: db.command.in(userIds) })
              .get();
            const usersMap = {};
            users.forEach(u => { usersMap[u._id] = u; });
            members = members.map(m => {
              const u = usersMap[m.userId];
              return {
                ...m,
                nickName: (u && u.nickName && u.nickName !== '德州玩家') ? u.nickName : m.nickName,
                avatarUrl: (u && u.avatarUrl) ? u.avatarUrl : (m.avatarUrl || ''),
              };
            });
          }
        } catch (_) {}
      }

      const fmtMatches = matches.map((m, i) => ({
        ...m,
        index: matches.length - i,
        createdAtStr: formatDate(m.createdAt),
      }));

      this.setData({ group, members, matches: fmtMatches, isAdmin, loading: false });
      this.calcLeaderboard(members, fmtMatches, group);
    } catch (err) {
      console.error('loadData error:', err.message || err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'error' });
    } finally {
      this._loading = false;
    }
  },

  /** 分批获取所有 scores（突破 20 条限制） */
  async _getAllScores(db, matchIds) {
    const batchSize = 20;
    let allScores = [];
    for (let i = 0; i < matchIds.length; i += batchSize) {
      const batch = matchIds.slice(i, i + batchSize);
      const { data } = await db.collection('scores')
        .where({ matchId: db.command.in(batch) })
        .limit(100)
        .get();
      allScores = allScores.concat(data);
    }
    return allScores;
  },

  async calcLeaderboard(members, matches, group) {
    const db = wx.cloud.database();
    const finishedMatches = matches.filter(m => m.status === 'finished');

    if (finishedMatches.length === 0) {
      const leaderboard = members.map(m => ({
        userId: m.userId,
        nickName: m.nickName,
        avatarUrl: m.avatarUrl || '',
        totalPoints: 0,
        matchCount: 0,
      }));
      this.setData({ leaderboard, trendSeries: [], trendLabels: [] });
      return;
    }

    try {
      const matchIds = finishedMatches.map(m => m._id);
      const scores = await this._getAllScores(db, matchIds);

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
        avatarUrl: m.avatarUrl || '',
        totalPoints: pointsMap[m.userId] || 0,
        matchCount: countMap[m.userId] || 0,
      })).sort((a, b) => b.totalPoints - a.totalPoints);

      // 计算积分趋势数据
      const { trendSeries, trendLabels } = this._calcTrend(finishedMatches, scores, members, matches);

      this.setData({ leaderboard, trendSeries, trendLabels });
    } catch (err) {
      console.warn('calcLeaderboard error:', err.message || err);
    }
  },

  _calcTrend(finishedMatches, scores, members, allMatches) {
    const COLORS = [
      '#e94560', '#4caf50', '#2196f3', '#ff9800', '#9c27b0',
      '#00bcd4', '#795548', '#607d8b', '#f44336', '#3f51b5',
    ];

    // 所有赛程按时间升序，建立真实序号映射
    const allSorted = [...allMatches].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt) : 0;
      const tb = b.createdAt ? new Date(b.createdAt) : 0;
      return ta - tb;
    });
    const matchIndexMap = {};
    allSorted.forEach((m, i) => { matchIndexMap[m._id] = i + 1; });

    // 已结束赛程按时间升序
    const sorted = [...finishedMatches].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt) : 0;
      const tb = b.createdAt ? new Date(b.createdAt) : 0;
      return ta - tb;
    });

    // 用真实序号作为标签
    const trendLabels = sorted.map(m => m.title || `第${matchIndexMap[m._id] || '?'}期`);

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
    wx.navigateTo({ url: `/subpages/match/create/create?groupId=${this.data.groupId}` });
  },

  goMatchDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/subpages/match/detail/detail?id=${id}&groupId=${this.data.groupId}` });
  },

  goMemberDetail(e) {
    const userId = e.currentTarget.dataset.userid;
    wx.navigateTo({ url: `/subpages/member/detail/detail?userId=${userId}&groupId=${this.data.groupId}` });
  },

  goRules() {
    wx.navigateTo({ url: `/subpages/rules/edit/edit?groupId=${this.data.groupId}` });
  },

  copyInviteCode() {
    const { group } = this.data;
    wx.setClipboardData({
      data: group.inviteCode,
      success: () => Toast.success('邀请码已复制'),
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

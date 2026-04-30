// pages/group/detail/detail.js
const app = getApp();
const { formatDate, calcPoints } = require('../../utils/util');
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
    // 二维码分享弹窗
    showQRCode: false,
    qrCodeBase64: '',
    qrCodeLoading: false,
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
          // 云函数已计算好 leaderboard（含最新头像），直接使用
          if (result.leaderboard) {
            this._cloudLeaderboard = result.leaderboard;
          }
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
      showToast({ context: this, selector: '#t-toast', message: '加载失败', theme: 'error' });
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
      // 若云函数已返回 leaderboard，直接用；否则前端计算
      if (this._cloudLeaderboard) {
        const lb = this._cloudLeaderboard;
        this._cloudLeaderboard = null;
        // 仍需计算趋势图
        this.calcLeaderboard(members, fmtMatches, group, lb);
      } else {
        this.calcLeaderboard(members, fmtMatches, group, null);
      }
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

  async calcLeaderboard(members, matches, group, prebuiltLeaderboard) {
    const db = wx.cloud.database();
    const finishedMatches = matches.filter(m => m.status === 'finished');

    if (finishedMatches.length === 0) {
      const leaderboard = prebuiltLeaderboard || members.map(m => ({
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

      // 优先使用云函数预构建的 leaderboard（含最新头像），否则前端构建
      const leaderboard = prebuiltLeaderboard || members.map(m => ({
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

    // 所有对局按时间升序，建立真实序号映射
    const allSorted = [...allMatches].sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt) : 0;
      const tb = b.createdAt ? new Date(b.createdAt) : 0;
      return ta - tb;
    });
    const matchIndexMap = {};
    allSorted.forEach((m, i) => { matchIndexMap[m._id] = i + 1; });

    // 已结束对局按时间升序
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
    const index = typeof e.detail === 'object' ? e.detail.value : e.detail;
    const tabs = ['matches', 'leaderboard', 'trend'];
    this.setData({ activeTab: tabs[index], activeTabIndex: Number(index) });
    // 切换到积分趋势 tab 时，主动触发绘制（真机懒渲染下组件可能刚挂载）
    if (Number(index) === 2) {
      setTimeout(() => {
        const chart = this.selectComponent('#trendChart');
        if (chart) chart.drawChart();
      }, 300);
    }
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
      success: () => showToast({ context: this, selector: '#t-toast', message: '邀请码已复制', theme: 'success' }),
    });
  },

  onShareAppMessage() {
    const { group } = this.data;
    return {
          title: `加入「${group.name}」德州组团`,
      path: `/pages/group/list/list?inviteCode=${group.inviteCode}`,
    };
  },

  /** 显示二维码分享弹窗，并生成小程序码 */
  async showShareQRCode() {
    const { group, qrCodeBase64 } = this.data;
    this.setData({ showQRCode: true });

    // 已经生成过，直接展示
    if (qrCodeBase64) return;

    this.setData({ qrCodeLoading: true });
    try {
      // envVersion: 'develop'=开发版, 'trial'=体验版, 'release'=正式版
      // 上线前改为 'release'
      const res = await wx.cloud.callFunction({
        name: 'getQRCode',
        data: {
          scene: `inviteCode=${group.inviteCode}`,
          page: 'pages/group/list/list',
          envVersion: 'develop',
        },
      });
      if (res.result && res.result.code === 0) {
        this.setData({ qrCodeBase64: res.result.base64 });
      } else {
        const msg = (res.result && res.result.message) || '生成失败';
        const errCode = res.result && res.result.errCode;
        console.error('getQRCode failed, errCode:', errCode, 'msg:', msg);
        // 根据常见错误码给出友好提示
        let tip = '二维码生成失败';
        if (errCode === -1000 || (msg && msg.includes('permission'))) {
          tip = '权限未配置，请重新上传云函数';
        } else if (msg && msg.includes('not found')) {
          tip = '云函数未部署，请先上传';
        }
        wx.showModal({
          title: '生成失败',
          content: `错误：${msg}${errCode ? `（${errCode}）` : ''}`,
          showCancel: false,
          confirmText: '知道了',
        });
      }
    } catch (err) {
      console.error('getQRCode error:', err);
      showToast({ context: this, selector: '#t-toast', message: '网络异常，请重试', theme: 'error' });
    } finally {
      this.setData({ qrCodeLoading: false });
    }
  },

  /** 关闭二维码弹窗 */
  hideShareQRCode() {
    this.setData({ showQRCode: false });
  },
});

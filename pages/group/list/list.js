// pages/group/list/list.js
const app = getApp();

Page({
  data: {
    groups: [],
    loading: true,
    showJoinModal: false,
    inviteCode: '',
    joining: false,
  },

  onLoad(options) {
    // 处理通过二维码/分享链接进入的情况
    if (options.inviteCode) {
      this.setData({ inviteCode: options.inviteCode, showJoinModal: true });
    }
  },

  onShow() {
    // 防止重复触发
    if (this._loading) return;
    this.checkLoginAndLoad();
  },

  async checkLoginAndLoad() {
    this._loading = true;
    if (!app.globalData.openId) {
      // 未登录，先尝试静默登录
      try {
        const res = await wx.cloud.callFunction({ name: 'login', data: {} });
        if (res.result.code === 0) {
          app.globalData.openId = res.result.openId;
          app.globalData.userInfo = {
            openId: res.result.openId,
            nickName: res.result.nickName,
            avatarUrl: res.result.avatarUrl,
          };
        } else {
          this._loading = false;
          wx.redirectTo({ url: '/pages/login/login' });
          return;
        }
      } catch (e) {
        this._loading = false;
        wx.redirectTo({ url: '/pages/login/login' });
        return;
      }
    }
    await this.loadGroups();
    this._loading = false;
  },

  async loadGroups() {
    this.setData({ loading: true });
    try {
      const db = wx.cloud.database();
      const openId = app.globalData.openId;

      // 查询用户加入的所有组
      const { data: members } = await db.collection('group_members')
        .where({ userId: openId })
        .orderBy('joinedAt', 'desc')
        .get();

      if (members.length === 0) {
        this.setData({ groups: [], loading: false });
        return;
      }

      const groupIds = members.map(m => m.groupId);
      const memberMap = {};
      members.forEach(m => { memberMap[m.groupId] = m; });

      // 批量查询记分组信息
      const { data: groupsData } = await db.collection('groups')
        .where({ _id: db.command.in(groupIds) })
        .get();

      // 查询每个组的成员数和赛程数（串行避免并发请求过多导致卡死）
      const groups = [];
      for (const g of groupsData) {
        const [memberRes, matchRes] = await Promise.all([
          db.collection('group_members').where({ groupId: g._id }).count(),
          db.collection('matches').where({ groupId: g._id }).count(),
        ]);
        groups.push({
          ...g,
          memberCount: memberRes.total,
          matchCount: matchRes.total,
          isAdmin: g.adminId === openId,
        });
      }

      // 按加入时间排序
      groups.sort((a, b) => {
        const ta = memberMap[a._id] && memberMap[a._id].joinedAt;
        const tb = memberMap[b._id] && memberMap[b._id].joinedAt;
        return (tb ? new Date(tb) : 0) - (ta ? new Date(ta) : 0);
      });

      this.setData({ groups, loading: false });
    } catch (err) {
      console.error('loadGroups error:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'error' });
    } finally {
      this._loading = false;
    }
  },

  goCreateGroup() {
    wx.navigateTo({ url: '/pages/group/create/create' });
  },

  goJoinGroup() {
    this.setData({ showJoinModal: true, inviteCode: '' });
  },

  closeJoinModal() {
    this.setData({ showJoinModal: false, inviteCode: '' });
  },

  onInviteCodeInput(e) {
    this.setData({ inviteCode: e.detail.value.toUpperCase() });
  },

  async confirmJoin() {
    const { inviteCode } = this.data;
    if (!inviteCode || inviteCode.length !== 6) {
      wx.showToast({ title: '请输入6位邀请码', icon: 'none' });
      return;
    }

    this.setData({ joining: true });
    try {
      const userInfo = app.globalData.userInfo || {};
      const res = await wx.cloud.callFunction({
        name: 'joinGroup',
        data: {
          inviteCode,
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
        },
      });

      if (res.result.code === 0) {
        this.setData({ showJoinModal: false, inviteCode: '' });
        wx.showToast({ title: res.result.alreadyJoined ? '已在组内' : '加入成功', icon: 'success' });
        wx.navigateTo({ url: `/pages/group/detail/detail?id=${res.result.groupId}` });
      } else {
        wx.showToast({ title: res.result.msg || '加入失败', icon: 'error' });
      }
    } catch (err) {
      wx.showToast({ title: '加入失败，请重试', icon: 'error' });
    } finally {
      this.setData({ joining: false });
    }
  },

  goGroupDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/group/detail/detail?id=${id}` });
  },
});

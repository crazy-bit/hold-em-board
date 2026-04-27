// pages/index/index.js
const app = getApp();

Page({
  data: {
    loading: true,
    isLoggedIn: false,
    hasGroup: false,
    group: null,
    myRank: 0,
    myPoints: 0,
    totalMembers: 0,
    matchCount: 0,
  },

  onShow() {
    if (!this._loading) {
      this.loadHomeSummary();
    }
  },

  async loadHomeSummary() {
    this._loading = true;

    // 登录检查：未登录不强制跳转，改为展示游客态
    if (!app.globalData.openId) {
      try {
        const res = await wx.cloud.callFunction({ name: 'login', data: {} });
        if (res.result.code === 0) {
          if (!res.result.nickName || res.result.nickName === '德州玩家') {
            // 未完成注册 → 展示游客态，不强制跳转
            this.setData({ loading: false, isLoggedIn: false });
            this._loading = false;
            return;
          }
          app.globalData.openId = res.result.openId;
          app.globalData.userInfo = {
            openId: res.result.openId,
            nickName: res.result.nickName,
            avatarUrl: res.result.avatarUrl,
          };
        } else {
          // 登录失败 → 展示游客态，不强制跳转
          this.setData({ loading: false, isLoggedIn: false });
          this._loading = false;
          return;
        }
      } catch (e) {
        // 异常 → 展示游客态，不强制跳转
        this.setData({ loading: false, isLoggedIn: false });
        this._loading = false;
        return;
      }
    }

    // 已登录，加载数据
    this.setData({ isLoggedIn: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getHomeSummary',
        data: {},
      });

      if (res.result.code === 0) {
        if (res.result.group) {
          this.setData({
            loading: false,
            hasGroup: true,
            group: res.result.group,
            myRank: res.result.myRank,
            myPoints: res.result.myPoints,
            totalMembers: res.result.totalMembers,
            matchCount: res.result.matchCount,
          });
        } else {
          this.setData({ loading: false, hasGroup: false });
        }
      } else {
        this.setData({ loading: false, hasGroup: false });
      }
    } catch (err) {
      console.error('loadHomeSummary error:', err);
      this.setData({ loading: false, hasGroup: false });
    } finally {
      this._loading = false;
    }
  },

  goGroupDetail() {
    const { group } = this.data;
    if (group && group._id) {
      wx.navigateTo({ url: `/subpages/group/detail/detail?id=${group._id}` });
    }
  },

  goCreateGroup() {
    // 需要登录才能创建
    if (!app.globalData.openId) {
      wx.navigateTo({ url: '/subpages/login/login' });
      return;
    }
    wx.navigateTo({ url: '/subpages/group/create/create' });
  },

  goGroupList() {
    wx.switchTab({ url: '/pages/group/list/list' });
  },

  // 主动登录入口
  goLogin() {
    wx.navigateTo({ url: '/subpages/login/login' });
  },
});

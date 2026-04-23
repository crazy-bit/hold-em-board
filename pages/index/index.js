// pages/index/index.js
const app = getApp();
const _Toast = require('@vant/weapp/toast/toast');
const Toast = _Toast.default || _Toast;

Page({
  data: {
    loading: true,
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

    // 登录检查
    if (!app.globalData.openId) {
      try {
        const res = await wx.cloud.callFunction({ name: 'login', data: {} });
        if (res.result.code === 0) {
          if (!res.result.nickName || res.result.nickName === '德州玩家') {
            this._loading = false;
            wx.navigateTo({ url: '/pages/login/login' });
            return;
          }
          app.globalData.openId = res.result.openId;
          app.globalData.userInfo = {
            openId: res.result.openId,
            nickName: res.result.nickName,
            avatarUrl: res.result.avatarUrl,
          };
        } else {
          this._loading = false;
          wx.navigateTo({ url: '/pages/login/login' });
          return;
        }
      } catch (e) {
        this._loading = false;
        wx.navigateTo({ url: '/pages/login/login' });
        return;
      }
    }

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
      wx.navigateTo({ url: `/pages/group/detail/detail?id=${group._id}` });
    }
  },

  goCreateGroup() {
    wx.navigateTo({ url: '/pages/group/create/create' });
  },

  goGroupList() {
    wx.switchTab({ url: '/pages/group/list/list' });
  },
});

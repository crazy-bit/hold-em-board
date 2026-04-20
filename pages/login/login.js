// pages/login/login.js
const app = getApp();

Page({
  data: {
    loading: false,
  },

  onLoad(options) {
    // 如果已登录，直接跳转
    if (app.globalData.openId) {
      this.redirectAfterLogin(options);
    }
  },

  async onGetUserInfo(e) {
    if (!e.detail.userInfo) {
      wx.showToast({ title: '需要授权才能使用', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    const { nickName, avatarUrl } = e.detail.userInfo;

    try {
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: { nickName, avatarUrl },
      });

      if (res.result.code === 0) {
        app.globalData.openId = res.result.openId;
        app.globalData.userInfo = {
          openId: res.result.openId,
          nickName: res.result.nickName,
          avatarUrl: res.result.avatarUrl,
        };

        // 跳转到记分组列表
        wx.switchTab({ url: '/pages/group/list/list' });
      } else {
        wx.showToast({ title: '登录失败，请重试', icon: 'error' });
      }
    } catch (err) {
      console.error('login error:', err);
      wx.showToast({ title: '登录失败，请重试', icon: 'error' });
    } finally {
      this.setData({ loading: false });
    }
  },

  redirectAfterLogin(options) {
    const redirect = options && options.redirect;
    if (redirect) {
      wx.navigateTo({ url: decodeURIComponent(redirect) });
    } else {
      wx.switchTab({ url: '/pages/group/list/list' });
    }
  },
});

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

  async onLoginTap() {
    this.setData({ loading: true });

    try {
      // 直接调用云函数登录，云函数内部通过 WXContext 获取 openId
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {},
      });

      console.log('login result:', JSON.stringify(res.result));

      if (res.result && res.result.code === 0) {
        app.globalData.openId = res.result.openId;
        app.globalData.userInfo = {
          openId: res.result.openId,
          nickName: res.result.nickName || '德州玩家',
          avatarUrl: res.result.avatarUrl || '',
        };

        // 跳转到记分组列表
        wx.switchTab({ url: '/pages/group/list/list' });
      } else {
        const msg = (res.result && res.result.msg) || '登录失败，请重试';
        console.error('login failed:', msg);
        wx.showToast({ title: msg, icon: 'none' });
      }
    } catch (err) {
      console.error('login error:', err);
      wx.showToast({ title: '网络异常，请重试', icon: 'none' });
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

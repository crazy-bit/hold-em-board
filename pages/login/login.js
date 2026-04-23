// pages/login/login.js
const app = getApp();

Page({
  data: {
    loading: false,
    nickName: '',
    avatarUrl: '',
  },

  onLoad(options) {
    if (app.globalData.openId) {
      this.redirectAfterLogin(options);
    }
  },

  onChooseAvatar(e) {
    this.setData({ avatarUrl: e.detail.avatarUrl });
  },

  onNickNameInput(e) {
    this.setData({ nickName: e.detail.value });
  },

  onNickNameBlur(e) {
    // type="nickname" 在 blur 时返回微信昵称
    if (e.detail.value) {
      this.setData({ nickName: e.detail.value });
    }
  },

  async onLoginTap() {
    const { nickName, avatarUrl } = this.data;

    if (!nickName.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {
          nickName: nickName.trim(),
          avatarUrl: avatarUrl || '',
        },
      });

      if (res.result && res.result.code === 0) {
        app.globalData.openId = res.result.openId;
        app.globalData.userInfo = {
          openId: res.result.openId,
          nickName: res.result.nickName,
          avatarUrl: res.result.avatarUrl,
        };

        wx.switchTab({ url: '/pages/group/list/list' });
      } else {
        const msg = (res.result && res.result.msg) || '登录失败，请重试';
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

// pages/login/login.js
const app = getApp();

Page({
  data: {
    loading: false,
    nickName: '',
    avatarUrl: '',
    autoFocusNickName: false,
  },

  async onLoad(options) {
    if (app.globalData.openId) {
      this.redirectAfterLogin(options);
      return;
    }
    // 尝试静默登录，预填已有的昵称和头像
    try {
      const res = await wx.cloud.callFunction({ name: 'login', data: {} });
      if (res.result && res.result.code === 0) {
        const { nickName, avatarUrl, openId } = res.result;
        // 有真实昵称（非默认值）说明已注册
        if (nickName && nickName !== '德州玩家') {
          // 若头像是旧的临时路径（wxfile://），说明之前没有正确上传
          // 临时路径跨会话失效，无法再上传，需要让用户重新选头像
          if (avatarUrl && avatarUrl.startsWith('wxfile://')) {
            // 预填昵称，清空头像，停留在登录页让用户重新选头像
            app.globalData.openId = openId; // 先存 openId，上传头像时需要
            this.setData({ nickName, avatarUrl: '' });
            setTimeout(() => { this.setData({ autoFocusNickName: false }); }, 100);
            return;
          }
          app.globalData.openId = openId;
          app.globalData.userInfo = { openId, nickName, avatarUrl };
          this.redirectAfterLogin(options);
          return;
        }
        // 有头像则预填
        if (avatarUrl) {
          this.setData({ avatarUrl });
        }
      }
    } catch (e) {
      // 静默登录失败不影响正常流程
    }
    // 延迟自动聚焦昵称输入框，触发微信昵称建议弹窗
    setTimeout(() => {
      this.setData({ autoFocusNickName: true });
    }, 500);
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

  /**
   * 将临时头像文件上传到云存储，返回永久 cloud:// fileID
   * 微信 <image> 组件原生支持 cloud:// fileID 直接显示
   * 若上传失败则返回原始临时路径（降级）
   */
  async _uploadAvatar(tempUrl) {
    if (!tempUrl || !tempUrl.startsWith('wxfile://')) {
      // 已经是 cloud:// 或 https:// 永久地址，直接返回
      return tempUrl;
    }
    try {
      const openId = app.globalData.openId || `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const ext = tempUrl.includes('.png') ? 'png' : 'jpg';
      const cloudPath = `avatars/${openId}_${Date.now()}.${ext}`;
      const res = await wx.cloud.uploadFile({
        cloudPath,
        filePath: tempUrl,
      });
      // 直接返回 cloud:// fileID，<image> 组件原生支持，永久有效
      return res.fileID;
    } catch (err) {
      console.warn('头像上传失败，使用临时路径:', err.message);
      return tempUrl; // 降级
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
      // 若头像是临时路径，先上传到云存储获取永久 URL
      const finalAvatarUrl = await this._uploadAvatar(avatarUrl);

      const res = await wx.cloud.callFunction({
        name: 'login',
        data: {
          nickName: nickName.trim(),
          avatarUrl: finalAvatarUrl || '',
        },
      });

      if (res.result && res.result.code === 0) {
        app.globalData.openId = res.result.openId;
        app.globalData.userInfo = {
          openId: res.result.openId,
          nickName: res.result.nickName,
          avatarUrl: res.result.avatarUrl,
        };

        // 异步同步 group_members 昵称，不阻塞页面跳转
        wx.cloud.callFunction({
          name: 'syncMemberInfo',
          data: {
            nickName: res.result.nickName,
            avatarUrl: res.result.avatarUrl,
          },
        }).catch(err => console.warn('syncMemberInfo failed:', err));

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

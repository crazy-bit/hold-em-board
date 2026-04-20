// pages/match/create/create.js
Page({
  data: {
    groupId: '',
    title: '',
    creating: false,
  },

  onLoad(options) {
    this.setData({ groupId: options.groupId });
  },

  onTitleInput(e) {
    this.setData({ title: e.detail.value });
  },

  async createMatch() {
    const { groupId, title } = this.data;
    this.setData({ creating: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'createMatch',
        data: { groupId, title },
      });

      if (res.result.code === 0) {
        wx.showToast({ title: '赛程已创建', icon: 'success' });
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/match/detail/detail?id=${res.result.matchId}&groupId=${groupId}`,
          });
        }, 800);
      } else {
        wx.showToast({ title: res.result.msg || '创建失败', icon: 'error' });
      }
    } catch (err) {
      wx.showToast({ title: '创建失败，请重试', icon: 'error' });
    } finally {
      this.setData({ creating: false });
    }
  },
});

// pages/match/create/create.js
const Toast = require('@vant/weapp/toast/toast');
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
    this.setData({ title: e.detail });
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
        Toast.success('赛程已创建');
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/match/detail/detail?id=${res.result.matchId}&groupId=${groupId}`,
          });
        }, 800);
      } else {
        Toast.fail(res.result.msg || '创建失败');
      }
    } catch (err) {
      Toast.fail('创建失败，请重试');
    } finally {
      this.setData({ creating: false });
    }
  },
});

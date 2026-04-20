// pages/group/create/create.js
const app = getApp();

Page({
  data: {
    groupName: '',
    creating: false,
  },

  onNameInput(e) {
    this.setData({ groupName: e.detail.value });
  },

  async createGroup() {
    const { groupName } = this.data;
    if (!groupName.trim()) return;

    this.setData({ creating: true });
    try {
      const userInfo = app.globalData.userInfo || {};
      const res = await wx.cloud.callFunction({
        name: 'createGroup',
        data: {
          name: groupName.trim(),
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
        },
      });

      if (res.result.code === 0) {
        wx.showToast({ title: '创建成功', icon: 'success' });
        setTimeout(() => {
          wx.redirectTo({
            url: `/pages/group/detail/detail?id=${res.result.groupId}`,
          });
        }, 1000);
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

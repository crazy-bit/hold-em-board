// pages/group/create/create.js
const app = getApp();
const _Toast = require('@vant/weapp/toast/toast');
const Toast = _Toast.default || _Toast;
Page({
  data: {
    groupName: '',
    creating: false,
  },

  onNameInput(e) {
    this.setData({ groupName: e.detail });
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
        Toast.success('创建成功');
        setTimeout(() => {
          wx.redirectTo({
            url: `/subpages/group/detail/detail?id=${res.result.groupId}`,
          });
        }, 1000);
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

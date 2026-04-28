// pages/group/create/create.js
const app = getApp();
let Toast;
try { Toast = require('tdesign-miniprogram/toast/index'); } catch(e) { Toast = null; }
function showToast(opts) {
  if (typeof Toast === 'function') {
    Toast(opts);
  } else {
    wx.showToast({ title: opts.message || '', icon: opts.theme === 'success' ? 'success' : 'none', duration: 2000 });
  }
}
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
      showToast({ context: this, selector: '#t-toast', message: '创建成功', theme: 'success' });
        setTimeout(() => {
          wx.redirectTo({
            url: `/subpages/group/detail/detail?id=${res.result.groupId}`,
          });
        }, 1000);
      } else {
      showToast({ context: this, selector: '#t-toast', message: res.result.msg || '创建失败', theme: 'error' });
      }
    } catch (err) {
      showToast({ context: this, selector: '#t-toast', message: '创建失败，请重试', theme: 'error' });
    } finally {
      this.setData({ creating: false });
    }
  },
});

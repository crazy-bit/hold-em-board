// pages/match/create/create.js
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
        showToast({ context: this, selector: '#t-toast', message: '对局已创建', theme: 'success' });
        setTimeout(() => {
          wx.redirectTo({
            url: `/subpages/match/detail/detail?id=${res.result.matchId}&groupId=${groupId}`,
          });
        }, 800);
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

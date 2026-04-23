// pages/index/index.js
Page({
  onLoad() {
    // 跳转到赛事列表
    wx.switchTab({
      url: '/pages/group/list/list',
    });
  },

  goToGroups() {
    wx.switchTab({
      url: '/pages/group/list/list',
    });
  },
});

// app.js
App({
  globalData: {
    userInfo: null,
    openId: null,
  },

  onLaunch() {
    // 初始化云开发
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-d1goy6u8nf336912a',
        traceUser: true,
      });
    }
  },
});

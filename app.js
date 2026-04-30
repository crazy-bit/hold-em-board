// app.js
App({
  globalData: {
    userInfo: null,
    openId: null,
  },

  onLaunch() {
    console.log('[App] onLaunch 开始', Date.now());

    // 初始化云开发 — 必须在 onLaunch 中同步调用，否则框架会报 timeout
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-d1goy6u8nf336912a',
        traceUser: true,
      });
    }

    console.log('[App] 云开发初始化完成', Date.now());
    console.log('[App] onLaunch 结束', Date.now());
  },

  onShow() {
    // 延迟加载 TDesign 图标字体，不阻塞启动流程
    if (!this._fontLoaded) {
      this._fontLoaded = true;
      setTimeout(() => {
        try {
          const tdesignFontSource = require('./utils/tdesign-font');
          wx.loadFontFace({
            global: true,
            family: 't',
            source: tdesignFontSource,
            scopes: ['webview', 'native'],
            success() {
              console.log('[App] TDesign 字体加载成功');
            },
            fail(err) {
              console.warn('[App] TDesign 字体加载失败:', err);
            },
          });
        } catch (e) {
          console.warn('[App] 字体模块加载异常:', e);
        }
      }, 1000);
    }
  },
});

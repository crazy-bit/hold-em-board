// pages/index/index.js
const app = getApp();

// 带超时的云函数调用封装
function callCloudWithTimeout(name, data = {}, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`云函数 ${name} 调用超时`)), timeout);
    wx.cloud.callFunction({ name, data })
      .then(res => { clearTimeout(timer); resolve(res); })
      .catch(err => { clearTimeout(timer); reject(err); });
  });
}

Page({
  data: {
    loading: true,
    isLoggedIn: false,
    hasGroup: false,
    group: null,
    myRank: 0,
    myPoints: 0,
    totalMembers: 0,
    matchCount: 0,
  },

  onLoad() {
    this.loadHomeSummary();
  },

  onShow() {
    // onLoad 已处理首次加载；后续 onShow（如从子页面返回）才刷新
    if (this._hasLoaded && !this._loading) {
      this.loadHomeSummary();
    }
  },

  async loadHomeSummary() {
    this._loading = true;
    const t0 = Date.now();
    console.log('[首页] loadHomeSummary 开始', t0);

    // 登录检查：未登录不强制跳转，改为展示游客态
    if (!app.globalData.openId) {
      try {
        console.log('[首页] 开始调用 login 云函数', Date.now());
        const res = await callCloudWithTimeout('login', {}, 15000);
        console.log('[首页] login 云函数返回', Date.now(), '耗时', Date.now() - t0, 'ms');
        if (res.result.code === 0) {
          if (!res.result.nickName || res.result.nickName === '德州玩家') {
            // 未完成注册 → 展示游客态，不强制跳转
            console.log('[首页] 未注册用户，展示游客态');
            this.setData({ loading: false, isLoggedIn: false });
            this._loading = false;
            return;
          }
          app.globalData.openId = res.result.openId;
          app.globalData.userInfo = {
            openId: res.result.openId,
            nickName: res.result.nickName,
            avatarUrl: res.result.avatarUrl,
          };
        } else {
          // 登录失败 → 展示游客态，不强制跳转
          console.log('[首页] login 返回失败', res.result);
          this.setData({ loading: false, isLoggedIn: false });
          this._loading = false;
          return;
        }
      } catch (e) {
        // 异常 → 展示游客态，不强制跳转
        console.error('[首页] login 异常', e.message, '耗时', Date.now() - t0, 'ms');
        this.setData({ loading: false, isLoggedIn: false });
        this._loading = false;
        return;
      }
    }

    // 已登录，加载数据
    this.setData({ isLoggedIn: true });
    try {
      console.log('[首页] 开始调用 getHomeSummary 云函数', Date.now());
      const res = await callCloudWithTimeout('getHomeSummary', {}, 15000);
      console.log('[首页] getHomeSummary 返回', Date.now(), '耗时', Date.now() - t0, 'ms');

      if (res.result.code === 0) {
        if (res.result.group) {
          this.setData({
            loading: false,
            hasGroup: true,
            group: res.result.group,
            myRank: res.result.myRank,
            myPoints: res.result.myPoints,
            totalMembers: res.result.totalMembers,
            matchCount: res.result.matchCount,
          });
        } else {
          this.setData({ loading: false, hasGroup: false });
        }
      } else {
        this.setData({ loading: false, hasGroup: false });
      }
    } catch (err) {
      console.error('loadHomeSummary error:', err);
      this.setData({ loading: false, hasGroup: false });
    } finally {
      this._loading = false;
      this._hasLoaded = true;
    }
  },

  goGroupDetail() {
    const { group } = this.data;
    if (group && group._id) {
      wx.navigateTo({ url: `/subpages/group/detail/detail?id=${group._id}` });
    }
  },

  goCreateGroup() {
    // 需要登录才能创建
    if (!app.globalData.openId) {
      wx.navigateTo({ url: '/subpages/login/login' });
      return;
    }
    wx.navigateTo({ url: '/subpages/group/create/create' });
  },

  goGroupList() {
    wx.switchTab({ url: '/pages/group/list/list' });
  },

  // 主动登录入口
  goLogin() {
    wx.navigateTo({ url: '/subpages/login/login' });
  },
});

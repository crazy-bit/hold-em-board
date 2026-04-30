// pages/group/list/list.js
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
    groups: [],
    loading: true,
    isLoggedIn: false,
    showJoinModal: false,
    inviteCode: '',
    joining: false,
  },

  onLoad(options) {
    // 处理通过二维码/分享链接进入的情况，记录邀请码，等登录完成后自动加入
    if (options.inviteCode) {
      this._pendingInviteCode = options.inviteCode;
      this.setData({ inviteCode: options.inviteCode });
    }
  },

  onShow() {
    // 防止重复触发
    if (this._loading) return;
    this.checkLoginAndLoad();
  },

  async checkLoginAndLoad() {
    this._loading = true;
    if (!app.globalData.openId) {
      // 未登录，先尝试静默登录
      try {
        const res = await wx.cloud.callFunction({ name: 'login', data: {} });
        if (res.result.code === 0) {
          // 如果昵称是默认值，展示游客态，不强制跳转
          if (!res.result.nickName || res.result.nickName === '德州玩家') {
            this.setData({ loading: false, isLoggedIn: false });
            this._loading = false;
            // 未完成登录时，弹出弹窗让用户先去登录
            if (this._pendingInviteCode) {
              this.setData({ showJoinModal: true });
            }
            return;
          }
          app.globalData.openId = res.result.openId;
          app.globalData.userInfo = {
            openId: res.result.openId,
            nickName: res.result.nickName,
            avatarUrl: res.result.avatarUrl,
          };
        } else {
          // 登录失败 → 展示游客态
          this.setData({ loading: false, isLoggedIn: false });
          this._loading = false;
          if (this._pendingInviteCode) {
            this.setData({ showJoinModal: true });
          }
          return;
        }
      } catch (e) {
        // 异常 → 展示游客态
        this.setData({ loading: false, isLoggedIn: false });
        this._loading = false;
        if (this._pendingInviteCode) {
          this.setData({ showJoinModal: true });
        }
        return;
      }
    }
    this.setData({ isLoggedIn: true });
    await this.loadGroups();
    this._loading = false;
    // 登录完成后，若有待处理的扫码邀请码，自动触发加入
    if (this._pendingInviteCode) {
      this._pendingInviteCode = null;
      await this.confirmJoin();
    }
  },

  async loadGroups() {
    this.setData({ loading: true });
    try {
      const res = await wx.cloud.callFunction({
        name: 'getMyGroups',
        data: {},
      });

      if (res.result.code === 0) {
        this.setData({ groups: res.result.groups, loading: false });
      } else {
        console.error('loadGroups error:', res.result.msg);
        this.setData({ loading: false });
        showToast({ context: this, selector: '#t-toast', message: '加载失败', theme: 'error' });
      }
    } catch (err) {
      console.error('loadGroups error:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'error' });
    } finally {
      this._loading = false;
    }
  },

  goLogin() {
    wx.navigateTo({ url: '/subpages/login/login' });
  },

  goCreateGroup() {
    // 需要登录才能创建
    if (!app.globalData.openId) {
      wx.navigateTo({ url: '/subpages/login/login' });
      return;
    }
    wx.navigateTo({ url: '/subpages/group/create/create' });
  },

  goJoinGroup() {
    // 需要登录才能加入
    if (!app.globalData.openId) {
      wx.navigateTo({ url: '/subpages/login/login' });
      return;
    }
    this.setData({ showJoinModal: true, inviteCode: '' });
  },

  closeJoinModal() {
    this.setData({ showJoinModal: false, inviteCode: '' });
  },

  onInviteCodeInput(e) {
    this.setData({ inviteCode: e.detail.value.toUpperCase() });
  },

  async confirmJoin() {
    const { inviteCode } = this.data;
    if (!inviteCode || inviteCode.length !== 6) {
      showToast({ context: this, selector: '#t-toast', message: '请输入6位邀请码', theme: 'warning' });
      return;
    }

    this.setData({ joining: true });
    try {
      const userInfo = app.globalData.userInfo || {};
      const res = await wx.cloud.callFunction({
        name: 'joinGroup',
        data: {
          inviteCode,
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl,
        },
      });

      if (res.result.code === 0) {
        this.setData({ showJoinModal: false, inviteCode: '' });
        showToast({ context: this, selector: '#t-toast', message: res.result.alreadyJoined ? '已在组内' : '加入成功', theme: 'success' });
        setTimeout(() => {
          wx.navigateTo({ url: `/subpages/group/detail/detail?id=${res.result.groupId}` });
        }, 800);
      } else {
        showToast({ context: this, selector: '#t-toast', message: res.result.msg || '加入失败', theme: 'error' });
      }
    } catch (err) {
      showToast({ context: this, selector: '#t-toast', message: '加入失败，请重试', theme: 'error' });
    } finally {
      this.setData({ joining: false });
    }
  },

  goGroupDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/subpages/group/detail/detail?id=${id}` });
  },
});

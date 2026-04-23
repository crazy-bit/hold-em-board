// pages/group/list/list.js
const app = getApp();
const _Toast = require('@vant/weapp/toast/toast');
const Toast = _Toast.default || _Toast;

Page({
  data: {
    groups: [],
    loading: true,
    showJoinModal: false,
    inviteCode: '',
    joining: false,
  },

  onLoad(options) {
    // 处理通过二维码/分享链接进入的情况
    if (options.inviteCode) {
      this.setData({ inviteCode: options.inviteCode, showJoinModal: true });
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
          // 如果昵称是默认值，引导用户去登录页设置
          if (!res.result.nickName || res.result.nickName === '德州玩家') {
            this._loading = false;
            wx.navigateTo({ url: '/pages/login/login' });
            return;
          }
          app.globalData.openId = res.result.openId;
          app.globalData.userInfo = {
            openId: res.result.openId,
            nickName: res.result.nickName,
            avatarUrl: res.result.avatarUrl,
          };
        } else {
          this._loading = false;
          wx.navigateTo({ url: '/pages/login/login' });
          return;
        }
      } catch (e) {
        this._loading = false;
        wx.navigateTo({ url: '/pages/login/login' });
        return;
      }
    }
    await this.loadGroups();
    this._loading = false;
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
        Toast.fail('加载失败');
      }
    } catch (err) {
      console.error('loadGroups error:', err);
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'error' });
    } finally {
      this._loading = false;
    }
  },

  goCreateGroup() {
    wx.navigateTo({ url: '/pages/group/create/create' });
  },

  goJoinGroup() {
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
      Toast('请输入6位邀请码');
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
        Toast.success(res.result.alreadyJoined ? '已在组内' : '加入成功');
        wx.navigateTo({ url: `/pages/group/detail/detail?id=${res.result.groupId}` });
      } else {
        Toast.fail(res.result.msg || '加入失败');
      }
    } catch (err) {
      Toast.fail('加入失败，请重试');
    } finally {
      this.setData({ joining: false });
    }
  },

  goGroupDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/group/detail/detail?id=${id}` });
  },
});

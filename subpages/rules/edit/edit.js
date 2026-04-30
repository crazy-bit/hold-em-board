// pages/rules/edit/edit.js
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
    initialChips: 1000,   // 统一初始积分
    chipRules: [],         // 仅含 bonus 按名次配置
    bonusCountsToTotal: false,
    saving: false,
  },

  onLoad(options) {
    this.setData({ groupId: options.groupId });
    this.loadRules();
  },

  async loadRules() {
    const { groupId } = this.data;
    const db = wx.cloud.database();

    try {
      const groupRes = await db.collection('groups').doc(groupId).get();
      const group = groupRes.data;
      const chipRules = group.chipRules || [{ rank: 0, initialChips: 1000, bonus: 0 }];

    // 从默认规则（rank=0）读取统一初始积分
      const defaultRule = chipRules.find(r => r.rank === 0) || { initialChips: 1000 };

      this.setData({
        initialChips: defaultRule.initialChips,
        chipRules,
        bonusCountsToTotal: group.bonusCountsToTotal || false,
      });
    } catch (err) {
      showToast({ context: this, selector: '#t-toast', message: '加载失败', theme: 'error' });
    }
  },

  onBonusToggle(e) {
    this.setData({ bonusCountsToTotal: e.detail.value });
  },

  onInitialChipsInput(e) {
    this.setData({ initialChips: Number(e.detail.value) || 0 });
  },

  onChipsInput(e) {
    const { index, field } = e.currentTarget.dataset;
    const chipRules = [...this.data.chipRules];
    chipRules[index] = { ...chipRules[index], [field]: Number(e.detail.value) || 0 };
    this.setData({ chipRules });
  },

  addRule() {
    const chipRules = [...this.data.chipRules];
    // 找到当前最大名次
    const maxRank = chipRules.reduce((max, r) => Math.max(max, r.rank), 0);
    chipRules.push({ rank: maxRank + 1, initialChips: this.data.initialChips, bonus: 0 });
    // 按名次排序（0排最后）
    chipRules.sort((a, b) => {
      if (a.rank === 0) return 1;
      if (b.rank === 0) return -1;
      return a.rank - b.rank;
    });
    this.setData({ chipRules });
  },

  deleteRule(e) {
    const { index } = e.currentTarget.dataset;
    const chipRules = [...this.data.chipRules];
    chipRules.splice(index, 1);
    this.setData({ chipRules });
  },

  async saveRules() {
    const { groupId, chipRules, bonusCountsToTotal, initialChips } = this.data;
    this.setData({ saving: true });

    try {
      const res = await wx.cloud.callFunction({
        name: 'saveRules',
        data: { groupId, chipRules, bonusCountsToTotal, initialChips },
      });

      if (res.result.code === 0) {
        showToast({ context: this, selector: '#t-toast', message: '规则已保存', theme: 'success' });
        setTimeout(() => wx.navigateBack(), 800);
      } else {
        showToast({ context: this, selector: '#t-toast', message: res.result.msg || '保存失败', theme: 'error' });
      }
    } catch (err) {
      showToast({ context: this, selector: '#t-toast', message: '保存失败，请重试', theme: 'error' });
    } finally {
      this.setData({ saving: false });
    }
  },
});

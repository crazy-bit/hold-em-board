## 1. JS 逻辑层

- [x] 1.1 在 `detail.js` 的 `data` 中新增 `showBalanceErrorModal: false` 和 `balanceDiff: 0` 两个字段
- [x] 1.2 在 `finishMatch()` 方法中，执行原有未填写检查之前，计算 `diff = sum(finalChips) - sum(bonus)`（只对 `finalChips != null` 的成员求和）
- [x] 1.3 若 `Math.abs(diff) >= 0.01`，调用 `this.setData({ showBalanceErrorModal: true, balanceDiff: diff })` 并 `return`，阻断原流程
- [x] 1.4 新增 `closeBalanceErrorModal()` 方法，将 `showBalanceErrorModal` 置为 `false`

## 2. WXML 视图层

- [x] 2.1 在 `detail.wxml` 中新增差额错误弹窗（`t-dialog` 或自定义 `view`），绑定 `visible="{{showBalanceErrorModal}}"`
- [x] 2.2 弹窗内容显示差额值：`{{balanceDiff > 0 ? '+' : ''}}{{balanceDiff}}`，并加说明文案"结算积分不平衡，请检查各玩家结算积分"
- [x] 2.3 弹窗提供"我知道了"关闭按钮，绑定 `bindtap="closeBalanceErrorModal"`

## 3. 样式层

- [x] 3.1 若自定义弹窗，在 `detail.wxss` 中添加差额数值的高亮样式（正数绿色，负数红色）

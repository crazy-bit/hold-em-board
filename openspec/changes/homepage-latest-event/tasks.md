## 1. 云函数

- [x] 1.1 创建 `cloudfunctions/getHomeSummary/index.js`：查询用户最近赛事，计算积分和排名
- [x] 1.2 创建 `cloudfunctions/getHomeSummary/package.json`

## 2. 首页改造

- [x] 2.1 重写 `pages/index/index.js`：移除自动跳转，加载首页数据（登录检查 + 调用 getHomeSummary）
- [x] 2.2 重写 `pages/index/index.wxml`：赛事摘要卡片（赛事名、积分、排名+奖牌）、空状态引导
- [x] 2.3 编写 `pages/index/index.wxss`：首页样式
- [x] 2.4 更新 `pages/index/index.json`：注册 Vant 组件

## 3. 配置调整

- [x] 3.1 调整 `app.json` tabBar 顺序：首页放第一位

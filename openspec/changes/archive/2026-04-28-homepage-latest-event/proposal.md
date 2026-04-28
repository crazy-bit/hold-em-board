## Why

当前首页（`pages/index/index`）是一个空白中转页，`onLoad` 时直接跳转到赛事列表。作为 tabBar 页面，首页应该有实际内容——展示用户最近参与的赛事概况和个人排名，让用户一打开就能看到自己的状态。

## What Changes

- 改造首页为信息展示页，移除自动跳转逻辑
- 展示用户最近参与的一个赛事卡片，包含：赛事名称、我的总积分、我的排名
- 排名第一显示🥇金牌标识，第二名显示🥈银牌标识，第三名显示🥉铜牌标识
- 新增 `getHomeSummary` 云函数，返回用户最近赛事的摘要数据
- 首页需要处理未登录、无赛事等空状态
- 调整 tabBar 顺序：首页放在第一个位置

## Capabilities

### New Capabilities

- `home-summary`: 首页展示最近赛事摘要（赛事名、总积分、排名、奖牌标识）

### Modified Capabilities

（无）

## Impact

- **新增云函数**: `cloudfunctions/getHomeSummary/`
- **前端页面**: `pages/index/index.*` 全部重写
- **配置**: `app.json` tabBar 顺序调整
- **测试**: 需新增首页相关 E2E 测试

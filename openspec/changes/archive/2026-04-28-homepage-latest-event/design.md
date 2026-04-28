## Context

首页当前是空白中转页（`onLoad` 直接 `switchTab` 到赛事列表），作为 tabBar 的第二个 tab 没有实际内容。需要改造为信息展示页，展示最近赛事和个人排名。

现有数据结构：
- `group_members`：通过 userId 查到用户加入的所有赛事组
- `groups`：赛事信息
- `matches`：赛程（按 createdAt 排序可得最近活跃的赛事）
- `scores`：每期积分

## Goals / Non-Goals

**Goals:**
- 首页展示最近参与的赛事摘要卡片（赛事名、总积分、排名、奖牌）
- 新增 `getHomeSummary` 云函数，一次返回所需数据
- 处理空状态（未登录、无赛事）
- tabBar 首页放第一位

**Non-Goals:**
- 不做多赛事切换（只展示最近一个）
- 不做推送通知
- 不展示详细积分历史（点击卡片跳转到详情页查看）

## Decisions

### 1. 新增 `getHomeSummary` 云函数

**选择**: 新建独立云函数而非复用 `getMyGroups`。

**理由**: `getMyGroups` 返回全部赛事列表但不含积分排名，而首页只需最近一个赛事的摘要数据（含排名）。独立云函数可以精确查询，减少数据传输。

**数据流**:
1. 查 `group_members` 获取用户所有 groupId
2. 查 `matches` 找到最近有活动的赛事（按最新赛程的 createdAt 排序）
3. 查 `scores` 计算该赛事的总积分和排名
4. 返回 `{ group, myRank, myPoints, totalMembers }`

### 2. 排名奖牌标识

**选择**: 使用 emoji（🥇🥈🥉）而非图片资源。

**理由**: 零额外资源占用，与积分榜已有的实现一致（`pages/group/detail/detail.wxml` 中已用 emoji 展示前三名）。

### 3. tabBar 顺序调整

**选择**: 首页放第一个位置，赛事列表放第二个。

**理由**: 首页是默认打开页面，放第一位符合用户预期。

## Risks / Trade-offs

- **[额外查询]** 首页每次显示需调用云函数 → 单次请求，数据量小，可接受
- **[最近赛事定义]** "最近"按最新赛程创建时间判断 → 简单直观，无歧义

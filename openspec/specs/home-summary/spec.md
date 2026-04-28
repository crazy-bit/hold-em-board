## ADDED Requirements

### Requirement: 首页展示最近赛事摘要
首页 SHALL 展示用户最近参与的一个赛事的摘要信息，包含赛事名称、我的总积分、我的排名。

#### Scenario: 有赛事且有已结束赛程
- **WHEN** 用户打开首页且有参与的赛事
- **THEN** 页面展示最近活跃赛事的名称、用户在该赛事中的总积分和排名

#### Scenario: 有赛事但无已结束赛程
- **WHEN** 用户有参与赛事但所有赛程都未结束
- **THEN** 页面展示赛事名称，积分显示为 0，排名显示为 "-"

#### Scenario: 未加入任何赛事
- **WHEN** 用户未加入任何赛事
- **THEN** 页面显示空状态引导，提供"加入赛事"和"创建赛事"入口

#### Scenario: 未登录
- **WHEN** 用户未登录
- **THEN** 页面跳转到登录页

### Requirement: 排名奖牌标识
首页排名区域 SHALL 根据用户排名显示对应奖牌标识。

#### Scenario: 第一名
- **WHEN** 用户在赛事中排名第一
- **THEN** 排名区域显示 🥇 金牌标识

#### Scenario: 第二名
- **WHEN** 用户在赛事中排名第二
- **THEN** 排名区域显示 🥈 银牌标识

#### Scenario: 第三名
- **WHEN** 用户在赛事中排名第三
- **THEN** 排名区域显示 🥉 铜牌标识

#### Scenario: 第四名及以后
- **WHEN** 用户排名第四或更低
- **THEN** 排名区域显示数字排名（如 "第4名"）

### Requirement: getHomeSummary 云函数
系统 SHALL 提供 `getHomeSummary` 云函数，返回当前用户最近赛事的摘要数据。

#### Scenario: 正常返回
- **WHEN** 云函数被调用
- **THEN** 返回 `{ code: 0, group, myRank, myPoints, totalMembers, matchCount }`

#### Scenario: 用户无赛事
- **WHEN** 用户未加入任何赛事
- **THEN** 返回 `{ code: 0, group: null }`

### Requirement: 点击卡片跳转详情
首页赛事卡片 SHALL 可点击跳转到对应赛事详情页。

#### Scenario: 点击赛事卡片
- **WHEN** 用户点击首页的赛事摘要卡片
- **THEN** 跳转到 `/pages/group/detail/detail?id=<groupId>`

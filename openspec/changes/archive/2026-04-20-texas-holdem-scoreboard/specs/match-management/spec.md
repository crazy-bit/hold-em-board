## ADDED Requirements

### Requirement: 创建赛程
管理员 SHALL 能够在记分组内创建新赛程，创建后赛程状态为"进行中"，组员可以开始填写分数。

#### Scenario: 管理员创建赛程
- **WHEN** 管理员在记分组内点击"创建赛程"
- **THEN** 系统创建一个状态为 active 的新赛程，所有组员可见并可填写分数

#### Scenario: 存在未结束赛程时创建新赛程
- **WHEN** 管理员在已有进行中赛程的情况下创建新赛程
- **THEN** 系统允许创建（支持多赛程并行）

### Requirement: 结束赛程
管理员 SHALL 能够结束进行中的赛程，结束后分数记录锁定并录入总积分。

#### Scenario: 管理员结束赛程
- **WHEN** 管理员点击"结束赛程"
- **THEN** 系统将赛程状态变为 finished，所有分数记录锁定不可修改，分数录入总积分

#### Scenario: 有组员未填写分数时结束赛程
- **WHEN** 管理员结束赛程但有组员尚未填写分数
- **THEN** 系统展示未填写人员列表，管理员确认后可强制结束（未填写者该赛程积分为0）

### Requirement: 销毁赛程
管理员 SHALL 能够销毁赛程，销毁后该赛程所有数据作废，不计入总积分。

#### Scenario: 管理员销毁赛程
- **WHEN** 管理员点击"销毁赛程"并确认
- **THEN** 系统将赛程状态变为 cancelled，该赛程分数不计入总积分

#### Scenario: 销毁已结束的赛程
- **WHEN** 管理员销毁一个已结束的赛程
- **THEN** 系统将该赛程从总积分中扣除，重新计算总积分

### Requirement: 赛程状态流转
赛程 SHALL 遵循状态机：active → finished 或 active → cancelled，finished → cancelled。

#### Scenario: 赛程状态不可逆转为 active
- **WHEN** 赛程已结束或已销毁
- **THEN** 系统不允许将赛程恢复为 active 状态

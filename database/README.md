# 数据库集合说明

## 集合列表

### groups（赛事）
| 字段               | 类型    | 说明                   |
| ------------------ | ------- | ---------------------- |
| _id                | string  | 自动生成               |
| name               | string  | 赛事名称             |
| adminId            | string  | 管理员 openId          |
| inviteCode         | string  | 邀请码（唯一）         |
| chipRules          | array   | 初始筹码规则（按名次） |
| bonusCountsToTotal | boolean | 额外加成是否计入总积分 |
| createdAt          | date    | 创建时间               |

chipRules 示例：
```json
[
  { "rank": 1, "initialChips": 1000, "bonus": 200 },
  { "rank": 2, "initialChips": 800, "bonus": 100 },
  { "rank": 0, "initialChips": 600, "bonus": 0 }
]
```
rank=0 表示默认规则（未上榜成员）

### group_members（组成员）
| 字段      | 类型   | 说明        |
| --------- | ------ | ----------- |
| _id       | string | 自动生成    |
| groupId   | string | 赛事 ID   |
| userId    | string | 用户 openId |
| nickName  | string | 用户昵称    |
| avatarUrl | string | 用户头像    |
| joinedAt  | date   | 加入时间    |

### matches（赛程）
| 字段          | 类型   | 说明                          |
| ------------- | ------ | ----------------------------- |
| _id           | string | 自动生成                      |
| groupId       | string | 赛事 ID                     |
| title         | string | 赛程标题                      |
| status        | string | active / finished / cancelled |
| createdAt     | date   | 创建时间                      |
| finishedAt    | date   | 结束时间                      |

> 注：规则统一存储在 `groups` 集合的 `chipRules` 和 `bonusCountsToTotal` 字段中，所有赛程共享组级规则。

### scores（分数记录）
| 字段         | 类型   | 说明                   |
| ------------ | ------ | ---------------------- |
| _id          | string | 自动生成               |
| matchId      | string | 赛程 ID                |
| groupId      | string | 赛事 ID              |
| userId       | string | 用户 openId            |
| nickName     | string | 用户昵称               |
| initialChips | number | 初始筹码               |
| bonus        | number | 额外加成               |
| finalChips   | number | 结算筹码（用户填写）   |
| points       | number | 本期积分（结算时计算） |
| updatedAt    | date   | 最后更新时间           |

## 索引建议

- groups: inviteCode（唯一索引）
- group_members: (groupId, userId)（联合唯一索引）
- matches: (groupId, status)
- scores: (matchId, userId)（联合唯一索引）

## 权限配置

所有集合建议使用「自定义安全规则」：
- groups: 所有人可读，仅管理员可写
- group_members: 组成员可读，自己可写
- matches: 组成员可读，仅管理员可写
- scores: 组成员可读，仅本人可写自己的记录

// 特殊操作云函数 - 用于一次性数据维护任务
const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d1goy6u8nf336912a' })

const db = cloud.database()

// 要插入的 group_members 数据
const GROUP_MEMBERS = [
  {
    _id: 'bC3e1Fa2D9c74B8dEa5F2b1cD6e0A7f3',
    groupId: '29787edc69f2f4170005bdb835d324f5',
    userId: 'opWZz3btoig2rdPWsiJpaF_EzaIA',
    nickName: '边帅',
    avatarUrl: 'wxfile://tmp_9a5b3b514830052859ef47616aacb91195b9f4ce3664e81e8121809d36061f8b.jpeg',
    isAdmin: false,
    joinedAt: new Date('2026-04-30T06:17:59.671Z'),
  },
  {
    _id: '9dA4cB7f2E1a5C8bFd3e6A0c2B9d1E4f',
    groupId: '29787edc69f2f4170005bdb835d324f5',
    userId: 'opWZz3aeFdE_mlL_QcPS4jZnL6i8',
    nickName: 'Anan',
    avatarUrl: 'wxfile://tmp_6b414fb07be86abe53c45e3150a029c6.jpg',
    isAdmin: false,
    joinedAt: new Date('2026-04-30T06:17:59.671Z'),
  },
  {
    _id: 'e2F8aD5c3B0d7E9fAc1b4C6e8D2f0A5b',
    groupId: '29787edc69f2f4170005bdb835d324f5',
    userId: 'opWZz3Xsmfxs-zNRa5BtyfbYNTFw',
    nickName: 'Tod',
    avatarUrl: 'wxfile://tmp_c9a9a00f065eb9370bf33f276e8e8fb804585217ce4922a6.jpeg',
    isAdmin: false,
    joinedAt: new Date('2026-04-30T06:17:59.671Z'),
  },
]

// 4 位成员信息（用于初始化 scores）
const MEMBERS = [
  { userId: 'opWZz3Rq8m-XtAqj9j_IDLw7cUO8',  nickName: 'yoyo' },
  { userId: 'opWZz3btoig2rdPWsiJpaF_EzaIA',   nickName: '边帅' },
  { userId: 'opWZz3aeFdE_mlL_QcPS4jZnL6i8',   nickName: 'Anan' },
  { userId: 'opWZz3Xsmfxs-zNRa5BtyfbYNTFw',   nickName: 'Tod'  },
]

/**
 * 为指定 groupId 下所有已存在的 matches 初始化 scores（每人一条，分数为 0）
 * 幂等：同一 matchId + userId 已存在则跳过
 */
async function initMatchScores(groupId) {
  // 查询该 group 下所有对局
  const { data: matches } = await db.collection('matches').where({ groupId }).get()
  if (matches.length === 0) {
    return { message: '该 group 下没有对局', results: [] }
  }

  const scoreCol = db.collection('scores')
  const results = []

  for (const match of matches) {
    for (const member of MEMBERS) {
      // 检查是否已存在
      const { data: existing } = await scoreCol
        .where({ matchId: match._id, userId: member.userId })
        .get()

      if (existing.length > 0) {
        results.push({ matchId: match._id, nickName: member.nickName, status: 'skipped' })
        console.log(`⏭️ 跳过已存在: ${member.nickName}@${match._id}`)
        continue
      }

      try {
        await scoreCol.add({
          data: {
            matchId: match._id,
            groupId,
            userId: member.userId,
            nickName: member.nickName,
            initialChips: 1000,
            bonus: 0,
            finalChips: null,
            points: null,
            updatedAt: db.serverDate(),
          },
        })
        results.push({ matchId: match._id, nickName: member.nickName, status: 'inserted' })
        console.log(`✅ 插入: ${member.nickName}@${match._id}`)
      } catch (err) {
        results.push({ matchId: match._id, nickName: member.nickName, status: 'error', error: err.message })
        console.error(`❌ 插入失败: ${member.nickName}@${match._id}`, err.message)
      }
    }
  }

  return { matchCount: matches.length, results }
}

/**
 * 插入 group_members 数据（幂等，已存在则跳过）
 */
async function insertGroupMembers() {
  const col = db.collection('group_members')
  const results = []

  for (const member of GROUP_MEMBERS) {
    try {
      // 已存在则跳过
      try {
        const existing = await col.doc(member._id).get()
        if (existing.data) {
          results.push({ _id: member._id, nickName: member.nickName, status: 'skipped' })
          console.log(`⏭️ 跳过已存在成员: ${member.nickName}`)
          continue
        }
      } catch (_) {
        // 不存在，继续插入
      }
      await col.add({ data: member })
      results.push({ _id: member._id, nickName: member.nickName, status: 'inserted' })
      console.log(`✅ 插入成员: ${member.nickName}`)
    } catch (err) {
      results.push({ _id: member._id, nickName: member.nickName, status: 'error', error: err.message })
      console.error(`❌ 插入成员 ${member.nickName} 失败:`, err.message)
    }
  }

  return results
}

/**
 * 云函数入口
 * @param {object} event
 * @param {string} event.action - 操作类型：
 *   - 'insertGroupMembers'：插入指定的 group_members 数据
 */
exports.main = async (event, context) => {
  const action = event.action

  try {
    if (action === 'insertGroupMembers') {
      const results = await insertGroupMembers()
      const inserted = results.filter((r) => r.status === 'inserted').length
      const skipped = results.filter((r) => r.status === 'skipped').length
      const errors = results.filter((r) => r.status === 'error').length
      return {
        code: 0,
        message: `group_members 插入完成：成功 ${inserted} 条，跳过 ${skipped} 条，失败 ${errors} 条`,
        results,
      }
    }

    if (action === 'initMatchScores') {
      const groupId = event.groupId || '29787edc69f2f4170005bdb835d324f5'
      const { matchCount, results } = await initMatchScores(groupId)
      const inserted = results.filter((r) => r.status === 'inserted').length
      const skipped = results.filter((r) => r.status === 'skipped').length
      const errors = results.filter((r) => r.status === 'error').length
      return {
        code: 0,
        message: `scores 初始化完成：共 ${matchCount} 场对局，插入 ${inserted} 条，跳过 ${skipped} 条，失败 ${errors} 条`,
        results,
      }
    }

    return { code: -1, message: `未知操作: ${action}` }
  } catch (err) {
    console.error('specialFuncs 执行失败:', err)
    return { code: -1, message: err.message }
  }
}

// 初始化数据库 - 创建集合 & 插入测试种子数据
const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d1goy6u8nf336912a' })

const db = cloud.database()

// 项目所需的全部集合
const COLLECTIONS = [
  'users',          // 用户信息
  'groups',         // 组团
  'group_members',  // 组团成员关系
  'matches',        // 牌局记录
  'scores',         // 分数记录
]

/**
 * 创建所有集合（幂等操作）
 */
async function createCollections() {
  const results = []
  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name)
      results.push({ collection: name, status: 'created' })
      console.log(`集合 ${name} 创建成功`)
    } catch (err) {
      if (err.errCode === -502001 || (err.message && err.message.includes('already exist'))) {
        results.push({ collection: name, status: 'already_exists' })
        console.log(`集合 ${name} 已存在，跳过`)
      } else {
        results.push({ collection: name, status: 'error', error: err.message })
        console.error(`集合 ${name} 创建失败:`, err)
      }
    }
  }
  return results
}

/**
 * 插入测试种子数据
 * @param {object} seedData - 按集合名分组的数据，如 { users: [...], groups: [...] }
 */
async function seedTestData(seedData) {
  const results = []
  for (const [collectionName, records] of Object.entries(seedData)) {
    if (!Array.isArray(records) || records.length === 0) continue
    const col = db.collection(collectionName)
    let successCount = 0
    let errorCount = 0
    for (const record of records) {
      try {
        // 如果记录中有 _id 字段，先尝试查询是否已存在
        if (record._id) {
          try {
            const existing = await col.doc(record._id).get()
            if (existing.data) {
              // 已存在则跳过
              successCount++
              continue
            }
          } catch (_) {
            // 不存在，继续插入
          }
        }
        await col.add({ data: record })
        successCount++
      } catch (err) {
        errorCount++
        console.error(`插入 ${collectionName} 记录失败:`, err.message)
      }
    }
    results.push({
      collection: collectionName,
      total: records.length,
      success: successCount,
      error: errorCount,
    })
  }
  return results
}

/**
 * 云函数入口
 * @param {object} event
 * @param {string} event.action - 操作类型：
 *   - 'createCollections'（默认）：仅创建集合
 *   - 'seed'：插入测试种子数据
 *   - 'init'：创建集合 + 插入种子数据
 * @param {object} [event.seedData] - 种子数据，action 为 'seed' 或 'init' 时需要
 */
exports.main = async (event, context) => {
  const action = event.action || 'createCollections'

  try {
    if (action === 'createCollections') {
      const results = await createCollections()
      return { code: 0, message: '数据库集合创建完成', results }
    }

    if (action === 'seed') {
      if (!event.seedData) {
        return { code: -1, message: '缺少 seedData 参数' }
      }
      const results = await seedTestData(event.seedData)
      return { code: 0, message: '测试数据插入完成', results }
    }

    if (action === 'init') {
      const collectionResults = await createCollections()
      let seedResults = []
      if (event.seedData) {
        seedResults = await seedTestData(event.seedData)
      }
      return {
        code: 0,
        message: '数据库初始化完成（集合 + 种子数据）',
        collectionResults,
        seedResults,
      }
    }

    return { code: -1, message: `未知操作: ${action}` }
  } catch (err) {
    console.error('initDB 执行失败:', err)
    return { code: -1, message: err.message }
  }
}

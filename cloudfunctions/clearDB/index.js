// 清空数据库 - 用于自动化测试前清理数据
const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d1goy6u8nf336912a' })

const db = cloud.database()
const _ = db.command

// 项目所需的全部集合
const ALL_COLLECTIONS = [
  'users',
  'groups',
  'group_members',
  'matches',
  'scores',
]

/**
 * 清空单个集合的所有数据
 * 云开发 remove 单次最多删除 20 条，需要循环删除
 * @param {string} collectionName 集合名称
 * @param {object} [filter] 可选的过滤条件，不传则清空全部
 * @returns {Promise<{collection: string, removed: number}>}
 */
async function clearCollection(collectionName, filter) {
  const col = db.collection(collectionName)
  let totalRemoved = 0
  const MAX_LOOPS = 100 // 安全上限，防止死循环

  for (let i = 0; i < MAX_LOOPS; i++) {
    try {
      const whereCondition = filter ? col.where(filter) : col.where({ _id: _.exists(true) })
      const res = await whereCondition.limit(100).remove()
      const removed = res.stats ? res.stats.removed : 0
      totalRemoved += removed
      if (removed === 0) break
    } catch (err) {
      // -502003 表示集合不存在，忽略
      if (err.errCode === -502003) {
        console.log(`集合 ${collectionName} 不存在，跳过`)
        break
      }
      console.error(`清空集合 ${collectionName} 出错:`, err.message)
      break
    }
  }

  return { collection: collectionName, removed: totalRemoved }
}

/**
 * 云函数入口
 * @param {object} event
 * @param {string} event.action - 操作类型：
 *   - 'clearAll'（默认）：清空所有集合的全部数据
 *   - 'clearCollections'：清空指定集合
 *   - 'clearByFilter'：按条件清空指定集合
 * @param {string[]} [event.collections] - 要清空的集合名列表（action 为 clearCollections/clearByFilter 时使用）
 * @param {object} [event.filter] - 过滤条件（action 为 clearByFilter 时使用）
 */
exports.main = async (event, context) => {
  const action = event.action || 'clearAll'

  try {
    let results = []

    if (action === 'clearAll') {
      // 清空所有集合
      for (const name of ALL_COLLECTIONS) {
        const result = await clearCollection(name)
        results.push(result)
      }
      return { code: 0, message: '所有集合数据已清空', results }
    }

    if (action === 'clearCollections') {
      // 清空指定集合
      const collections = event.collections || []
      if (collections.length === 0) {
        return { code: -1, message: '缺少 collections 参数' }
      }
      for (const name of collections) {
        const result = await clearCollection(name)
        results.push(result)
      }
      return { code: 0, message: '指定集合数据已清空', results }
    }

    if (action === 'clearByFilter') {
      // 按条件清空指定集合
      const collections = event.collections || []
      if (collections.length === 0 || !event.filter) {
        return { code: -1, message: '缺少 collections 或 filter 参数' }
      }
      for (const name of collections) {
        const result = await clearCollection(name, event.filter)
        results.push(result)
      }
      return { code: 0, message: '按条件清空完成', results }
    }

    return { code: -1, message: `未知操作: ${action}` }
  } catch (err) {
    console.error('clearDB 执行失败:', err)
    return { code: -1, message: err.message }
  }
}

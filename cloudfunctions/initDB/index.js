// 初始化数据库 - 批量创建所有需要的集合
const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloud1-d1goy6u8nf336912a' })

const db = cloud.database()

// 项目所需的全部集合
const COLLECTIONS = [
  'users',          // 用户信息
  'groups',         // 记分组
  'group_members',  // 记分组成员关系
  'matches',        // 牌局记录
  'scores',         // 分数记录
]

exports.main = async (event, context) => {
  const results = []

  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name)
      results.push({ collection: name, status: 'created' })
      console.log(`集合 ${name} 创建成功`)
    } catch (err) {
      // 错误码 -502001 表示集合已存在，属于正常情况
      if (err.errCode === -502001 || (err.message && err.message.includes('already exist'))) {
        results.push({ collection: name, status: 'already_exists' })
        console.log(`集合 ${name} 已存在，跳过`)
      } else {
        results.push({ collection: name, status: 'error', error: err.message })
        console.error(`集合 ${name} 创建失败:`, err)
      }
    }
  }

  return {
    code: 0,
    message: '数据库初始化完成',
    results
  }
}

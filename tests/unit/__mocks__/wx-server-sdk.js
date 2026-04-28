/**
 * __tests__/unit/__mocks__/wx-server-sdk.js
 * wx-server-sdk 的 Jest mock
 * 让云函数的纯业务逻辑可以在 Node.js 环境中测试
 */

// 模拟数据库操作的工厂函数
function createMockDb(collections = {}) {
  const mockDb = {
    _collections: collections,
    command: {
      in: (arr) => ({ $in: arr }),
    },
    serverDate: () => new Date(),
    collection: jest.fn((name) => createMockCollection(mockDb, name)),
  };
  return mockDb;
}

function createMockCollection(db, name) {
  return {
    _name: name,
    doc: jest.fn((id) => ({
      get: jest.fn().mockResolvedValue({ data: (db._collections[name] || []).find(d => d._id === id) || {} }),
      update: jest.fn().mockResolvedValue({ stats: { updated: 1 } }),
    })),
    add: jest.fn().mockResolvedValue({ _id: `mock_id_${Date.now()}` }),
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    get: jest.fn().mockResolvedValue({ data: db._collections[name] || [] }),
    count: jest.fn().mockResolvedValue({ total: (db._collections[name] || []).length }),
    update: jest.fn().mockResolvedValue({ stats: { updated: 1 } }),
  };
}

// 模拟 openapi.wxacode.getUnlimited，返回一个假的 PNG buffer
const mockGetUnlimited = jest.fn().mockResolvedValue({
  // 最小合法 PNG 文件的二进制内容（8字节PNG签名）
  buffer: Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
});

const mockCloud = {
  init: jest.fn(),
  DYNAMIC_CURRENT_ENV: 'mock-env',
  getWXContext: jest.fn(() => ({ OPENID: 'mock_openid_admin' })),
  database: jest.fn(() => createMockDb()),
  _createMockDb: createMockDb, // 暴露给测试用例使用
  openapi: {
    wxacode: {
      getUnlimited: mockGetUnlimited,
    },
  },
  _mockGetUnlimited: mockGetUnlimited, // 暴露给测试用例使用
};

module.exports = mockCloud;

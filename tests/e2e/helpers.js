/**
 * tests/e2e/helpers.js
 * E2E 测试辅助工具函数
 * 封装常用操作，提供安全的元素操作和页面导航
 */

const { getConsoleLogs } = require('./setup');

/**
 * 等待指定毫秒数
 * @param {number} ms 毫秒数
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 轮询等待元素出现
 * @param {Page} page 页面实例
 * @param {string} selector CSS 选择器
 * @param {number} timeout 超时时间（毫秒），默认 5000
 * @param {number} interval 轮询间隔（毫秒），默认 300
 * @returns {Promise<Element>} 元素实例
 */
async function waitForElement(page, selector, timeout = 5000, interval = 300) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const el = await page.$(selector);
    if (el) return el;
    await sleep(interval);
  }
  throw new Error(`Element '${selector}' not found within ${timeout}ms`);
}

/**
 * 安全点击元素（先等待元素存在再点击）
 * @param {Page} page 页面实例
 * @param {string} selector CSS 选择器
 * @param {number} timeout 等待超时（毫秒）
 */
async function safeTap(page, selector, timeout = 5000) {
  const el = await waitForElement(page, selector, timeout);
  await el.tap();
  return el;
}

/**
 * 安全输入文本（先等待元素存在再输入）
 * @param {Page} page 页面实例
 * @param {string} selector CSS 选择器
 * @param {string} text 输入文本
 * @param {number} timeout 等待超时（毫秒）
 */
async function safeInput(page, selector, text, timeout = 5000) {
  const el = await waitForElement(page, selector, timeout);
  await el.input(text);
  return el;
}

/**
 * 确保当前在指定页面，否则使用 reLaunch 导航
 * reLaunch 会关闭所有页面并打开目标页面，避免页面栈溢出
 * @param {MiniProgram} miniProgram 小程序实例
 * @param {string} pagePath 目标页面路径（如 '/pages/group/create/create'）
 * @param {number} waitMs 导航后等待时间（毫秒）
 * @returns {Promise<Page>} 当前页面实例
 */
async function ensureOnPage(miniProgram, pagePath, waitMs = 1000) {
  await miniProgram.reLaunch(pagePath);
  await sleep(waitMs);
  const page = await miniProgram.currentPage();
  return page;
}

/**
 * 等待页面 data 中某个字段满足条件
 * @param {Page} page 页面实例
 * @param {Function} predicate 判断函数，接收 data 返回 boolean
 * @param {number} timeout 超时时间（毫秒）
 * @param {number} interval 轮询间隔（毫秒）
 */
async function waitForData(page, predicate, timeout = 5000, interval = 300) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const data = await page.data();
    if (predicate(data)) return data;
    await sleep(interval);
  }
  throw new Error(`Page data condition not met within ${timeout}ms`);
}

/**
 * 等待页面跳转到指定路径
 * @param {MiniProgram} miniProgram 小程序实例
 * @param {string|string[]} pathPatterns 目标路径模式（支持数组，任一匹配即可）
 * @param {number} timeout 超时时间（毫秒）
 * @param {number} interval 轮询间隔（毫秒）
 * @returns {Promise<Page>} 跳转后的页面实例
 */
async function waitForNavigation(miniProgram, pathPatterns, timeout = 8000, interval = 500) {
  const patterns = Array.isArray(pathPatterns) ? pathPatterns : [pathPatterns];
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const page = await miniProgram.currentPage();
    if (patterns.some((p) => page.path.includes(p))) return page;
    await sleep(interval);
  }
  const currentPage = await miniProgram.currentPage();
  throw new Error(
    `Navigation timeout: expected path containing [${patterns.join(', ')}], but got '${currentPage.path}'`
  );
}

/**
 * 等待小程序 console 中出现包含指定文本的日志
 * @param {string} text 要匹配的文本（支持部分匹配）
 * @param {Object} [options] 选项
 * @param {string} [options.type] 日志类型过滤（'log'|'warn'|'error'|'info'）
 * @param {number} [options.timeout=5000] 超时时间（毫秒）
 * @param {number} [options.interval=300] 轮询间隔（毫秒）
 * @returns {Promise<Object>} 匹配到的日志条目
 */
async function waitForConsoleMessage(text, options = {}) {
  const { type, timeout = 5000, interval = 300 } = options;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const logs = getConsoleLogs(type);
    const found = logs.find((entry) => entry.text.includes(text));
    if (found) return found;
    await sleep(interval);
  }
  throw new Error(`Console message containing '${text}' not found within ${timeout}ms`);
}

/**
 * 通过 miniProgram.evaluate 在小程序端执行数据库操作，向 group_members 插入模拟成员
 * 用于模拟多人记分组场景（automator 只有一个真实用户身份，其余成员通过数据库直接插入）
 * @param {MiniProgram} miniProgram 小程序实例
 * @param {string} groupId 记分组 ID
 * @param {Array<{userId: string, nickName: string}>} members 要插入的模拟成员列表
 * @returns {Promise<number>} 成功插入的成员数量
 */
async function addMockMembers(miniProgram, groupId, members) {
  let addedCount = 0;
  for (const member of members) {
    try {
      const result = await miniProgram.evaluate(
        (gId, uId, nick) => {
          return new Promise((resolve) => {
            const db = wx.cloud.database();
            db.collection('group_members')
              .add({
                data: {
                  groupId: gId,
                  userId: uId,
                  nickName: nick,
                  avatarUrl: '',
                  isAdmin: false,
                  joinedAt: new Date(),
                },
              })
              .then(() => resolve({ ok: true }))
              .catch((err) => resolve({ ok: false, err: err.message || String(err) }));
          });
        },
        groupId,
        member.userId,
        member.nickName
      );
      if (result && result.ok) {
        addedCount++;
      } else {
        console.warn(`⚠️ 插入模拟成员 ${member.nickName} 失败: ${result && result.err}`);
      }
    } catch (err) {
      console.warn(`⚠️ 插入模拟成员 ${member.nickName} 异常: ${err.message}`);
    }
  }
  return addedCount;
}

/**
 * 通过 miniProgram.evaluate 在小程序端清理模拟成员数据
 * @param {MiniProgram} miniProgram 小程序实例
 * @param {string} groupId 记分组 ID
 * @param {string[]} userIds 要清理的模拟成员 userId 列表
 */
async function removeMockMembers(miniProgram, groupId, userIds) {
  for (const userId of userIds) {
    try {
      await miniProgram.evaluate(
        (gId, uId) => {
          return new Promise((resolve) => {
            const db = wx.cloud.database();
            db.collection('group_members')
              .where({ groupId: gId, userId: uId })
              .remove()
              .then(() => resolve({ ok: true }))
              .catch((err) => resolve({ ok: false, err: err.message || String(err) }));
          });
        },
        groupId,
        userId
      );
    } catch (err) {
      console.warn(`⚠️ 清理模拟成员 ${userId} 异常: ${err.message}`);
    }
  }
}

module.exports = {
  sleep,
  waitForElement,
  safeTap,
  safeInput,
  ensureOnPage,
  waitForData,
  waitForNavigation,
  waitForConsoleMessage,
  addMockMembers,
  removeMockMembers,
};

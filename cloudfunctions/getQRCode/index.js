// cloudfunctions/getQRCode/index.js
const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

/**
 * 生成小程序码云函数
 * 开发/体验阶段使用 wxacode.get（无需发布版本）
 * 正式上线后可改为 wxacode.getUnlimited（支持无限个，需已发布）
 * 返回 base64 格式图片，前端直接用 data:image/png;base64,xxx 展示
 */
exports.main = async (event) => {
  const { scene, page } = event;

  // 拼接完整落地页路径（含参数）
  const fullPath = `${page || 'pages/group/list/list'}?${scene}`;

  try {
    // wxacode.get：不需要小程序已发布，开发版即可使用
    // 限制：path 总长度不超过 128 字符
    const result = await cloud.openapi.wxacode.get({
      path: fullPath,
      width: 280,
      isHyaline: false,
    });

    const base64 = Buffer.from(result.buffer).toString('base64');
    return {
      code: 0,
      base64: 'data:image/png;base64,' + base64,
    };
  } catch (err) {
    console.error('getQRCode error:', JSON.stringify({
      message: err.message,
      errCode: err.errCode,
      errMsg: err.errMsg,
      stack: err.stack,
    }));
    return {
      code: -1,
      message: err.errMsg || err.message || String(err),
      errCode: err.errCode || null,
    };
  }
};

/**
 * tests/unit/package-size.test.js
 * 主包大小验证测试
 * 确保主包尺寸（不含插件）< 1.5MB
 * 参考：https://developers.weixin.qq.com/community/develop/doc/00040e5a0846706e893dcc24256009
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../');

// 主包大小上限（字节）
const MAIN_PACKAGE_SIZE_LIMIT = 1.5 * 1024 * 1024; // 1.5MB

/**
 * 递归统计目录/文件大小（字节）
 */
function getDirSize(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  const stat = fs.statSync(dirPath);
  if (stat.isFile()) return stat.size;
  let total = 0;
  for (const entry of fs.readdirSync(dirPath)) {
    total += getDirSize(path.join(dirPath, entry));
  }
  return total;
}

/**
 * 主包包含的目录/文件（不含 subpages、cloudfunctions、node_modules、.git 等）
 */
const MAIN_PACKAGE_PATHS = [
  'app.js',
  'app.json',
  'app.wxss',
  'pages',
  'components',
  'utils',
  'asserts',
  'image',
  'miniprogram_npm',
  'sitemap.json',
];

describe('主包大小验证', () => {
  it(`主包总大小应小于 1.5MB（${(MAIN_PACKAGE_SIZE_LIMIT / 1024).toFixed(0)}KB）`, () => {
    let totalSize = 0;
    const details = [];

    for (const p of MAIN_PACKAGE_PATHS) {
      const fullPath = path.join(ROOT, p);
      const size = getDirSize(fullPath);
      totalSize += size;
      details.push(`  ${p}: ${(size / 1024).toFixed(1)}KB`);
    }

    console.log('主包各部分大小：\n' + details.join('\n'));
    console.log(`主包总大小：${(totalSize / 1024).toFixed(1)}KB / ${(MAIN_PACKAGE_SIZE_LIMIT / 1024).toFixed(0)}KB`);

    expect(totalSize).toBeLessThan(MAIN_PACKAGE_SIZE_LIMIT);
  });

  it('主包 miniprogram_npm 中不应包含分包专用的 tdesign 组件（tabs/input/tab-panel）', () => {
    const mainNpmPath = path.join(ROOT, 'miniprogram_npm/tdesign-miniprogram');
    const subpackageOnlyComponents = ['tabs', 'tab-panel', 'input'];

    for (const comp of subpackageOnlyComponents) {
      const compPath = path.join(mainNpmPath, comp);
      expect(fs.existsSync(compPath)).toBe(false);
    }
  });

  it('分包 miniprogram_npm 应包含所有分包页面需要的 tdesign 组件', () => {
    const subNpmPath = path.join(ROOT, 'subpages/miniprogram_npm/tdesign-miniprogram');
    const requiredComponents = ['button', 'dialog', 'tag', 'toast', 'tabs', 'tab-panel', 'input', 'empty', 'skeleton'];

    for (const comp of requiredComponents) {
      const compPath = path.join(subNpmPath, comp);
      expect(fs.existsSync(compPath)).toBe(true);
    }
  });

  it('分包页面 json 中的 tdesign 引用路径应指向分包内 miniprogram_npm', () => {
    const subpageJsonFiles = [
      'subpages/group/detail/detail.json',
      'subpages/match/detail/detail.json',
      'subpages/group/create/create.json',
      'subpages/match/create/create.json',
      'subpages/score/input/input.json',
      'subpages/rules/edit/edit.json',
      'subpages/member/detail/detail.json',
    ];

    for (const jsonFile of subpageJsonFiles) {
      const fullPath = path.join(ROOT, jsonFile);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const json = JSON.parse(content);
      const components = json.usingComponents || {};

      for (const [name, compPath] of Object.entries(components)) {
        if (compPath.includes('tdesign-miniprogram')) {
          // 分包页面的 tdesign 引用不应使用绝对路径 /miniprogram_npm/
          expect(compPath).not.toMatch(/^\/miniprogram_npm\//);
          // 应使用相对路径指向分包内 miniprogram_npm
          expect(compPath).toMatch(/miniprogram_npm\/tdesign-miniprogram/);
        }
      }
    }
  });
});

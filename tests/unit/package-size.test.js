/**
 * tests/unit/package-size.test.js
 * 主包大小验证测试
 * 确保主包尺寸（不含插件）< 1.5MB
 * 参考：https://developers.weixin.qq.com/community/develop/doc/00040e5a0846706e893dcc24256009
 *
 * 方案：通过 project.config.json packOptions.ignore 排除不需要的 tdesign 组件目录
 * 分包页面使用绝对路径 /miniprogram_npm/... 引用主包的 tdesign 组件
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../');

// 主包大小上限（字节）
const MAIN_PACKAGE_SIZE_LIMIT = 1.5 * 1024 * 1024; // 1.5MB

/**
 * 递归统计目录/文件大小（字节），支持排除指定目录
 */
function getDirSize(dirPath, ignoreNames = []) {
  if (!fs.existsSync(dirPath)) return 0;
  const stat = fs.statSync(dirPath);
  if (stat.isFile()) return stat.size;
  let total = 0;
  for (const entry of fs.readdirSync(dirPath)) {
    if (ignoreNames.includes(entry)) continue;
    total += getDirSize(path.join(dirPath, entry), ignoreNames);
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

// packOptions.ignore 中排除的 tdesign 组件目录名（不打包进小程序）
const IGNORED_TDESIGN_COMPONENTS = [
  'action-sheet', 'attachments', 'avatar', 'avatar-group', 'back-top', 'badge',
  'calendar', 'cascader', 'cell', 'cell-group', 'chat-actionbar', 'chat-content',
  'chat-list', 'chat-loading', 'chat-markdown', 'chat-message', 'chat-sender',
  'chat-thinking', 'checkbox', 'checkbox-group', 'check-tag', 'col', 'collapse',
  'collapse-panel', 'color-picker', 'config-provider', 'count-down', 'date-time-picker',
  'divider', 'drawer', 'dropdown-item', 'dropdown-menu', 'fab', 'footer', 'form',
  'form-item', 'grid', 'grid-item', 'guide', 'image-viewer', 'indexes', 'indexes-anchor',
  'link', 'message', 'message-item', 'navbar', 'notice-bar', 'picker', 'picker-item',
  'popover', 'progress', 'pull-down-refresh', 'qrcode', 'radio', 'radio-group',
  'rate', 'result', 'row', 'scroll-view', 'search', 'segmented', 'side-bar',
  'side-bar-item', 'slider', 'step-item', 'stepper', 'steps', 'sticky', 'swipe-cell',
  'swiper', 'swiper-nav', 'switch', 'tab-bar', 'tab-bar-item', 'table', 'textarea',
  'tree-select', 'upload', 'watermark',
];

describe('主包大小验证', () => {
  it(`主包打包后总大小应小于 1.5MB（packOptions.ignore 排除不需要的组件后）`, () => {
    let totalSize = 0;
    const details = [];

    for (const p of MAIN_PACKAGE_PATHS) {
      const fullPath = path.join(ROOT, p);
      // miniprogram_npm 需要排除 packOptions.ignore 中的目录
      const ignoreNames = p === 'miniprogram_npm' ? IGNORED_TDESIGN_COMPONENTS : [];
      const size = getDirSize(fullPath, ignoreNames);
      totalSize += size;
      details.push(`  ${p}: ${(size / 1024).toFixed(1)}KB`);
    }

    console.log('主包各部分大小（排除 ignore 后）：\n' + details.join('\n'));
    console.log(`主包总大小：${(totalSize / 1024).toFixed(1)}KB / ${(MAIN_PACKAGE_SIZE_LIMIT / 1024).toFixed(0)}KB`);

    expect(totalSize).toBeLessThan(MAIN_PACKAGE_SIZE_LIMIT);
  });

  it('project.config.json packOptions.ignore 应包含所有不需要的 tdesign 组件', () => {
    const configPath = path.join(ROOT, 'project.config.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const ignoreList = config.packOptions?.ignore || [];
    const ignoredFolders = ignoreList
      .filter(item => item.type === 'folder')
      .map(item => item.value);

    for (const comp of IGNORED_TDESIGN_COMPONENTS) {
      const expectedPath = `miniprogram_npm/tdesign-miniprogram/${comp}`;
      expect(ignoredFolders).toContain(expectedPath);
    }
  });

  it('主包 miniprogram_npm 中应包含所有实际使用的 tdesign 组件', () => {
    const mainNpmPath = path.join(ROOT, 'miniprogram_npm/tdesign-miniprogram');
    const requiredComponents = [
      'button', 'skeleton', 'toast', 'dialog', 'tag', 'empty',
      'tabs', 'tab-panel', 'input',
      'common', 'icon', 'overlay', 'popup', 'transition', 'loading', 'image',
    ];

    for (const comp of requiredComponents) {
      const compPath = path.join(mainNpmPath, comp);
      expect(fs.existsSync(compPath)).toBe(true);
    }
  });

  it('分包页面 json 中的 tdesign 引用应使用绝对路径 /miniprogram_npm/...', () => {
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
          // 分包页面应使用绝对路径引用主包的 tdesign 组件
          expect(compPath).toMatch(/^\/miniprogram_npm\/tdesign-miniprogram\//);
        }
      }
    }
  });
});

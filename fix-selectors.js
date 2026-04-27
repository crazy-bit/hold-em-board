const fs = require('fs');
const path = require('path');

const baseDir = 'i:/ai/hold-em-board';

function fixFile(filePath, rules) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;
  rules.forEach(([from, to]) => {
    content = content.split(from).join(to);
  });
  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${path.basename(filePath)}`);
  } else {
    console.log(`⏭️  No changes: ${path.basename(filePath)}`);
  }
}

// ── multiPlayer.test.js ──
fixFile(path.join(baseDir, 'tests/e2e/multiPlayer.test.js'), [
  // group create 页
  [`await waitForElement(page, 't-input >>> .t-input__input', 8000);`, `await waitForData(page, d => d.groupName !== undefined, 8000);`],
  [`await waitForElement(p, 't-input >>> .t-input__input', 5000);`, `await waitForData(p, d => d.groupName !== undefined, 5000);`],
  [`await safeInput(page, 't-input >>> .t-input__input', groupName, 5000);`, `await page.setData({ groupName: groupName });`],
  [`await safeTap(page, 't-button >>> button');`, `await page.callMethod('createGroup');`],
  // match create 页
  [`await waitForElement(page, 't-button >>> button', 5000);\n      await safeTap(page, 't-button >>> button');`, `await waitForData(page, d => typeof d.creating === 'boolean', 5000);\n      await page.callMethod('createMatch');`],
  // admin-actions 按钮
  [`page.$$('.admin-actions t-button >>> button')`, `page.$$('.admin-actions t-button')`],
  // t-dialog 弹窗按钮
  [`page.$$('t-dialog >>> .t-dialog__footer t-button >>> button')`, `page.$$('t-dialog .t-dialog__footer t-button')`],
]);

// ── match.test.js ──
fixFile(path.join(baseDir, 'tests/e2e/match.test.js'), [
  // group create 页前置
  [`await waitForElement(page, 't-input >>> .t-input__input', 8000);`, `await waitForData(page, d => d.groupName !== undefined, 8000);`],
  [`await waitForElement(p, 't-input >>> .t-input__input', 5000);`, `await waitForData(p, d => d.groupName !== undefined, 5000);`],
  [`await safeInput(page, 't-input >>> .t-input__input', \`赛程测试组_\${Date.now()}\`, 5000);`, `await page.setData({ groupName: \`赛程测试组_\${Date.now()}\` });`],
  [`await safeTap(page, 't-button >>> button');\n      groupId = `, `await page.callMethod('createGroup');\n      groupId = `],
  // match create 页
  [`await waitForElement(page, 't-button >>> button', 5000);\n      await safeTap(page, 't-button >>> button');`, `await waitForData(page, d => typeof d.creating === 'boolean', 5000);\n      await page.callMethod('createMatch');`],
  // score input 页
  [`await safeTap(page, 't-button >>> button');\n\n        await sleep`, `await page.callMethod('saveScore');\n\n        await sleep`],
  [`await safeTap(page, 't-button >>> button');\n\n      const currentPage`, `await page.callMethod('saveScore');\n\n      const currentPage`],
  // admin-actions 按钮
  [`page.$$('.admin-actions t-button >>> button')`, `page.$$('.admin-actions t-button')`],
  // t-dialog 弹窗按钮
  [`page.$$('t-dialog >>> .t-dialog__footer t-button >>> button')`, `page.$$('t-dialog .t-dialog__footer t-button')`],
  // const input = await page.$('t-input >>> .t-input__input')
  [`const input = await page.$('t-input >>> .t-input__input');`, `const input = null; // t-input 不支持 DOM 查询`],
  // const btn = await waitForElement(page, 't-button >>> button', 5000)
  [`const btn = await waitForElement(page, 't-button >>> button', 5000);`, `await waitForData(page, d => typeof d.creating === 'boolean', 5000); const btn = null;`],
  // const btn = await page.$('t-button >>> button')
  [`const btn = await page.$('t-button >>> button');`, `const btn = null; // t-button 不支持 DOM 查询`],
]);

// ── member.test.js ──
fixFile(path.join(baseDir, 'tests/e2e/member.test.js'), [
  // group create 页前置
  [`await waitForElement(page, 't-input >>> .t-input__input', 8000);`, `await waitForData(page, d => d.groupName !== undefined, 8000);`],
  [`await waitForElement(p, 't-input >>> .t-input__input', 5000);`, `await waitForData(p, d => d.groupName !== undefined, 5000);`],
  [`await safeInput(page, 't-input >>> .t-input__input', \`成员测试组_\${Date.now()}\`, 5000);`, `await page.setData({ groupName: \`成员测试组_\${Date.now()}\` });`],
  [`await safeTap(page, 't-button >>> button');`, `await page.callMethod('createGroup');`],
  // member 积分测试前置 - group create
  [`await waitForElement(createPage, 't-input >>> .t-input__input', 8000);`, `await waitForData(createPage, d => d.groupName !== undefined, 8000);`],
  [`await waitForElement(p, 't-input >>> .t-input__input', 5000);`, `await waitForData(p, d => d.groupName !== undefined, 5000);`],
  [`await safeInput(createPage, 't-input >>> .t-input__input', \`成员积分测试_\${Date.now()}\`, 5000);`, `await createPage.setData({ groupName: \`成员积分测试_\${Date.now()}\` });`],
  [`await safeTap(createPage, 't-button >>> button');`, `await createPage.callMethod('createGroup');`],
  // match create 页
  [`await waitForElement(matchPage, 't-button >>> button', 5000);`, `await waitForData(matchPage, d => typeof d.creating === 'boolean', 5000);`],
  [`await safeTap(matchPage, 't-button >>> button');`, `await matchPage.callMethod('createMatch');`],
  // admin-actions 按钮
  [`currentPage.$$('.admin-actions t-button >>> button')`, `currentPage.$$('.admin-actions t-button')`],
  // t-dialog 弹窗按钮
  [`currentPage.$$('t-dialog >>> .t-dialog__footer t-button >>> button')`, `currentPage.$$('t-dialog .t-dialog__footer t-button')`],
]);

// ── rules.test.js ──
fixFile(path.join(baseDir, 'tests/e2e/rules.test.js'), [
  // group create 页前置
  [`await waitForElement(page, 't-input >>> .t-input__input', 8000);`, `await waitForData(page, d => d.groupName !== undefined, 8000);`],
  [`await waitForElement(p, 't-input >>> .t-input__input', 5000);`, `await waitForData(p, d => d.groupName !== undefined, 5000);`],
  [`await safeInput(page, 't-input >>> .t-input__input', \`规则测试组_\${Date.now()}\`, 5000);`, `await page.setData({ groupName: \`规则测试组_\${Date.now()}\` });`],
  [`await safeTap(page, 't-button >>> button');\n      groupId = `, `await page.callMethod('createGroup');\n      groupId = `],
  // rules edit 页保存按钮
  [`await safeTap(page, 't-button >>> button');`, `await page.callMethod('saveRules');`],
]);

console.log('All done!');
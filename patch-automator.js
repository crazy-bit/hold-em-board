/**
 * patch-automator.js
 * 修复 miniprogram-automator checkVersion 中 SDKVersion 为 undefined 时的 split 报错
 */
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'node_modules/miniprogram-automator/out/MiniProgram.js');
let content = fs.readFileSync(filePath, 'utf8');

const oldStr = 'async checkVersion(){let t="";if(t=(await this.send("Tool.getInfo")).SDKVersion,"dev"!==t&&cmpVersion_1.default(t,"2.7.3")<0)throw Error(`SDKVersion is currently ${t}, while automator(${pkg.version}) requires at least version 2.7.3`)}';
const newStr = 'async checkVersion(){let t="dev";try{const info=await this.send("Tool.getInfo");t=info.SDKVersion||"dev";}catch(e){}if("dev"!==t&&t&&cmpVersion_1.default(t,"2.7.3")<0)throw Error(`SDKVersion is currently ${t}, while automator(${pkg.version}) requires at least version 2.7.3`)}';

if (content.includes(oldStr)) {
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✅ patch 成功');
} else {
  console.log('⚠️  未找到目标字符串，可能已经 patch 过或版本不同');
  // 检查是否已经 patch
  if (content.includes('const info=await this.send')) {
    console.log('✅ 已经是 patch 后的版本');
  }
}

const { spawn } = require('child_process');
const path = require('path');

const projectPath = path.resolve(__dirname);
console.log('启动 auto，项目路径:', projectPath);

const child = spawn('D:/微信web开发者工具/cli.bat', [
  'auto',
  '--project', projectPath,
  '--auto-port', '9420'
], {
  stdio: 'inherit',
  shell: true,
  cwd: __dirname
});

child.on('exit', (code) => {
  console.log('auto 进程退出，code:', code);
  process.exit(code || 0);
});

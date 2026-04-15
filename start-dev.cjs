const { fork } = require('child_process');
const path = require('path');

process.chdir(__dirname);

const viteBin = path.join(__dirname, 'node_modules', 'vite', 'bin', 'vite.js');
const child = fork(viteBin, ['--host', '0.0.0.0', '--port', '5173'], {
  cwd: __dirname,
  stdio: 'inherit',
  windowsHide: true
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

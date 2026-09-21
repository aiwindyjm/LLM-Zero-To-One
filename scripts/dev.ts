import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { findRoot } from '../apps/api/src/paths.js';

const root = findRoot();
const requireWeb = createRequire(resolve(root, 'apps/web/package.json'));
const vite = resolve(requireWeb.resolve('vite/package.json'), '../bin/vite.js');
const children = [
  spawn(
    process.execPath,
    ['--env-file-if-exists=.env', '--import', 'tsx', 'apps/api/src/main.ts'],
    { cwd: root, stdio: 'inherit', windowsHide: true },
  ),
  spawn(
    process.execPath,
    [vite, '--host', process.env.LLM_CONTAINER === '1' ? '0.0.0.0' : '127.0.0.1'],
    {
      cwd: resolve(root, 'apps/web'),
      stdio: 'inherit',
      windowsHide: true,
    },
  ),
];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => child.kill('SIGTERM'));
  process.exitCode = code;
}
children.forEach((child) => {
  child.on('error', () => stop(1));
  child.on('exit', (code) => stop(code || 0));
});
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

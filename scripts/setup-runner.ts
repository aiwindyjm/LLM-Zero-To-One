import { spawn } from 'node:child_process';
import { runnerCommand } from '../apps/api/src/runner-command.js';
import { findRoot } from '../apps/api/src/paths.js';

const argumentsToPass = ['--cpu', '--refresh-lock'].filter((argument) =>
  process.argv.includes(argument),
);
const command = runnerCommand(findRoot(), 'setup.py', argumentsToPass);
const child = spawn(command.command, command.args, { stdio: 'inherit', windowsHide: true });
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code) => {
  process.exitCode = code ?? 1;
});

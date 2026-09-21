import { realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';

export interface RunnerCommand {
  command: string;
  args: string[];
}

export function runnerCommand(
  root: string,
  script = 'bootstrap.py',
  args: string[] = [],
): RunnerCommand {
  const path = realpathSync(resolve(root, 'runner', script));
  if (process.env.LLM_RUNNER_PYTHON && process.platform !== 'win32') {
    return { command: process.env.LLM_RUNNER_PYTHON, args: [path, ...args] };
  }
  if (process.platform === 'win32') {
    const distribution = process.env.LLM_WSL_DISTRO || 'Ubuntu';
    const linuxPath = execFileSync(
      'wsl.exe',
      ['-d', distribution, '--exec', 'wslpath', '-a', path.replaceAll('\\', '/')],
      { encoding: 'utf8', windowsHide: true, timeout: 10000 },
    ).trim();
    return {
      command: 'wsl.exe',
      args: ['-d', distribution, '--exec', 'python3', linuxPath, ...args],
    };
  }
  return { command: 'python3', args: [path, ...args] };
}

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { experimentResultSchema } from '@llm/contracts';
import { findRoot } from '../apps/api/src/paths.js';
import { runnerCommand } from '../apps/api/src/runner-command.js';

const root = findRoot();
const preset = process.argv.includes('--cuda') ? 'cuda' : 'cpu';
const data = process.argv.includes('--data');
const command = runnerCommand(root);
const child = spawn(command.command, command.args, { windowsHide: true, stdio: 'pipe' });
let verified = false;
const timer = setTimeout(() => {
  child.stdin.end(`${JSON.stringify({ kind: 'cancel' })}\n`);
  process.exitCode = 1;
}, 120000);
const watchdog = setTimeout(() => {
  child.kill();
  process.exitCode = 1;
}, 127000);
createInterface({ input: child.stdout }).on('line', (line) => {
  const event = JSON.parse(line);
  if (event.kind === 'result') {
    const result = experimentResultSchema.parse(event.result);
    if (
      data
        ? !result.dataTrace || result.shapes.inputs.join(',') !== '2,8'
        : result.shapes.logits.join(',') !== '2,8,256'
    )
      throw new Error('Invalid output shape');
    mkdirSync(resolve(root, '.local/validation'), { recursive: true });
    writeFileSync(
      resolve(root, `.local/validation/${data ? 'data-' : ''}${preset}.json`),
      JSON.stringify(result, null, 2),
    );
    console.log(JSON.stringify(result, null, 2));
    verified = true;
  } else if (event.kind === 'exit') {
    if (event.code !== 0) verified = false;
    child.stdin.end();
  } else console.log(event.message || event.kind);
});
child.stderr.pipe(process.stderr);
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('close', (code) => {
  clearTimeout(timer);
  clearTimeout(watchdog);
  process.exitCode = code === 0 && verified ? 0 : 1;
});
child.stdin.write(
  `${JSON.stringify({ kind: 'run', preset, sequenceLength: 8, experimentId: data ? 'data-trace' : 'forward-trace' })}\n`,
);

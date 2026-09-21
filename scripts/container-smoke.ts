import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { experimentResultSchema } from '@llm/contracts';

const base = process.env.LLM_SMOKE_URL || 'http://127.0.0.1:4310';
const preset = process.argv.includes('--cuda') ? 'cuda' : 'cpu';
const data = process.argv.includes('--data');
const container = process.env.LLM_SMOKE_CONTAINER;
const request = {
  lessonId: data ? 'nanochat-data' : 'nanochat-forward',
  lessonVersion: '1.0.0',
  experimentId: data ? 'data-trace' : 'forward-trace',
  preset,
  sequenceLength: 8,
};
let token = '';
async function api(path: string, body?: unknown) {
  const response = await fetch(`${base}/api${path}`, {
    headers: { 'Content-Type': 'application/json', 'x-local-token': token },
    ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }),
  });
  assert.equal(response.ok, true, `${path}: ${await response.clone().text()}`);
  return response.json();
}
async function connect() {
  const deadline = Date.now() + 45000;
  while (Date.now() < deadline) {
    try {
      token = (await api('/session')).token;
      return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
  throw new Error('Container did not become ready');
}
async function terminal(id: string) {
  const deadline = Date.now() + 130000;
  while (Date.now() < deadline) {
    const { run } = await api(`/runs/${id}`);
    if (!['running', 'queued'].includes(run.status)) return run;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Experiment did not finish');
}
await connect();
const started = await api('/runs', request);
const result = await terminal(started.id);
assert.equal(result.status, 'succeeded', result.error);
experimentResultSchema.parse(result.result);
assert.equal((data ? result.result.dataTrace : result.result.trace).version, 1);
const cancelled = await api('/runs', request);
await api(`/runs/${cancelled.id}/cancel`, {});
assert.equal((await terminal(cancelled.id)).status, 'cancelled');
if (container) {
  const interrupted = await api('/runs', request);
  execFileSync('docker', ['restart', container], { stdio: 'inherit' });
  await connect();
  assert.equal((await api(`/runs/${started.id}`)).run.status, 'succeeded');
  assert.equal((await api(`/runs/${cancelled.id}`)).run.status, 'cancelled');
  assert.equal((await terminal(interrupted.id)).status, 'interrupted');
}
mkdirSync(resolve('.local/validation'), { recursive: true });
writeFileSync(
  resolve(`.local/validation/container-${data ? 'data-' : ''}${preset}.json`),
  JSON.stringify(result, null, 2),
);
console.log(
  JSON.stringify({
    preset,
    status: result.status,
    duration: result.result.durationSeconds,
    peakMemoryMb: result.result.peakMemoryMb,
    cancelled: cancelled.id,
    restartChecked: Boolean(container),
  }),
);

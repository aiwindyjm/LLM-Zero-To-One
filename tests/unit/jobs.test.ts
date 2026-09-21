import { afterEach, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { JobManager } from '../../apps/api/src/jobs.js';
import { Store } from '../../apps/api/src/database.js';
import { findRoot } from '../../apps/api/src/paths.js';

const open: { jobs: JobManager; store: Store }[] = [];
const input = {
  lessonId: 'nanochat-forward' as const,
  lessonVersion: '1.0.0' as const,
  experimentId: 'forward-trace' as const,
  preset: 'cpu' as const,
  sequenceLength: 8 as const,
};
function setup(mode: string, timeout = 2000) {
  const store = new Store(':memory:');
  const root = findRoot();
  const jobs = new JobManager(
    root,
    store,
    () => ({ command: process.execPath, args: [resolve(root, 'tests/fixtures/worker.mjs'), mode] }),
    timeout,
  );
  open.push({ store, jobs });
  return { store, jobs };
}
afterEach(async () => {
  for (const entry of open.splice(0)) {
    await entry.jobs.close();
    entry.store.close();
  }
});

it('serializes jobs and allows cancellation of a queued task', async () => {
  const { jobs, store } = setup('success');
  const first = jobs.enqueue(input);
  const second = jobs.enqueue(input);
  expect(store.getRun(first.id)?.status).toBe('running');
  expect(store.getRun(second.id)?.status).toBe('queued');
  jobs.cancel(second.id);
  await expect.poll(() => store.getRun(first.id)?.status).toBe('succeeded');
  expect(store.getRun(second.id)?.status).toBe('cancelled');
});
it('cancels active processes and releases the execution slot', async () => {
  const { jobs, store } = setup('hang');
  const run = jobs.enqueue(input);
  jobs.cancel(run.id);
  await expect.poll(() => store.getRun(run.id)?.status).toBe('cancelled');
});
it('records timeouts as failure rather than successful completion', async () => {
  const { jobs, store } = setup('hang', 150);
  const run = jobs.enqueue(input);
  await expect.poll(() => store.getRun(run.id)?.status).toBe('failed');
  expect(store.getRun(run.id)?.error).toContain('超过');
});
it('records OOM errors without fabricating a result', async () => {
  const { jobs, store } = setup('failure');
  const run = jobs.enqueue(input);
  await expect.poll(() => store.getRun(run.id)?.status).toBe('failed');
  expect(store.getRun(run.id)?.error).toContain('out of memory');
  expect(store.getRun(run.id)?.result).toBeNull();
});
it('marks active work interrupted on service shutdown', async () => {
  const { jobs, store } = setup('hang');
  const run = jobs.enqueue(input);
  await jobs.close();
  expect(store.getRun(run.id)?.status).toBe('interrupted');
});

import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createApp } from '../apps/api/src/app.js';
import { JobManager } from '../apps/api/src/jobs.js';
import { findRoot } from '../apps/api/src/paths.js';

process.env.PORT = '4420';
delete process.env.TUTOR_API_KEY;
const root = findRoot();
const { app } = await createApp({
  root,
  database: resolve(mkdtempSync(resolve(tmpdir(), 'llm-browser-')), 'test.db'),
  jobs: (store) =>
    new JobManager(root, store, (diagnostic) => ({
      command: process.execPath,
      args: [
        resolve(root, 'tests/fixtures/worker.mjs'),
        'trace',
        ...(diagnostic ? ['--diagnose'] : []),
      ],
    })),
});
await app.listen({ host: '127.0.0.1', port: 4420 });
process.on('SIGTERM', () => {
  void app.close().then(() => process.exit(0));
});

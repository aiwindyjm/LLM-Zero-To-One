import { resolve } from 'node:path';
import { createApp } from './app.js';
import { findRoot } from './paths.js';

const root = findRoot();
const host = process.env.HOST || '127.0.0.1';
if (
  !['127.0.0.1', 'localhost'].includes(host) &&
  !(process.env.LLM_CONTAINER === '1' && host === '0.0.0.0')
)
  throw new Error('This local execution service must bind to loopback.');
const { app } = await createApp({
  root,
  database: resolve(root, process.env.LLM_DATA_DIR || '.local/data', 'learning.db'),
  logger: true,
});
await app.listen({ host, port: Number(process.env.PORT || 4310) });
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    void app.close().then(() => process.exit(0));
  });

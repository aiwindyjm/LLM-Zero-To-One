import { build } from 'esbuild';

await build({
  entryPoints: ['apps/api/src/main.ts'],
  outfile: 'apps/api/dist/main.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  external: ['fastify', '@fastify/static', 'better-sqlite3', 'drizzle-orm', 'drizzle-orm/*', 'zod'],
  target: 'node24',
});

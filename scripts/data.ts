import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { existsSync, mkdirSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { findRoot } from '../apps/api/src/paths.js';

const root = findRoot();
const [operation, file, container] = process.argv.slice(2);
if (!file || !['backup', 'export', 'import'].includes(operation))
  throw new Error(
    'Usage: pnpm data backup <new-file> | export <new-file> <container> | import <backup> <stopped-container>',
  );
const path = resolve(file);
const docker = (args: string[]) => execFileSync('docker', args, { encoding: 'utf8' }).trim();
if (operation === 'backup') {
  const requireApi = createRequire(resolve(root, 'apps/api/package.json'));
  const Database = requireApi('better-sqlite3') as typeof import('better-sqlite3');
  const source = resolve(root, process.env.LLM_DATA_DIR || '.local/data', 'learning.db');
  mkdirSync(dirname(path), { recursive: true });
  closeSync(openSync(path, 'wx'));
  const database = new Database(source, { readonly: true, fileMustExist: true });
  try {
    await database.backup(path);
  } catch (error) {
    unlinkSync(path);
    throw error;
  } finally {
    database.close();
  }
} else {
  if (!container) throw new Error('Supply the container ID from docker compose ps -aq app');
  const info = JSON.parse(docker(['inspect', container]))[0];
  const temporary = `/data/transfer-${randomUUID()}.db`;
  if (operation === 'export') {
    if (!info.State.Running) throw new Error('Export requires a running container');
    if (existsSync(path)) throw new Error('Destination already exists');
    mkdirSync(dirname(path), { recursive: true });
    docker([
      'exec',
      container,
      '/opt/runner/bin/python',
      '/app/runner/data.py',
      'backup',
      '/data/learning.db',
      temporary,
    ]);
    try {
      docker(['cp', `${container}:${temporary}`, path]);
    } finally {
      docker([
        'exec',
        container,
        '/opt/runner/bin/python',
        '-c',
        'import os,sys; os.unlink(sys.argv[1])',
        temporary,
      ]);
    }
  } else {
    if (info.State.Running) throw new Error('Stop the target container before import');
    if (!existsSync(path)) throw new Error('Backup does not exist');
    docker(['cp', path, `${container}:${temporary}`]);
    if (JSON.parse(docker(['inspect', container]))[0].State.Running)
      throw new Error('Target restarted; import aborted');
    docker([
      'run',
      '--rm',
      '--network',
      'none',
      '--user',
      '0',
      '--volumes-from',
      container,
      '--entrypoint',
      '/opt/runner/bin/python',
      info.Image,
      '-c',
      'import os,sys; from pathlib import Path; sys.path.insert(0,"/app/runner"); from data import restore; restore(Path(sys.argv[1]),Path("/data/learning.db")); os.chown("/data/learning.db",1000,1000); os.unlink(sys.argv[1])',
      temporary,
    ]);
  }
}
console.log(`Completed ${operation}: ${path}`);

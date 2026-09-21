import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function findRoot(start = dirname(fileURLToPath(import.meta.url))): string {
  let directory = resolve(start);
  while (!existsSync(resolve(directory, 'content/lessons/nanochat-forward.json'))) {
    const parent = dirname(directory);
    if (parent === directory) throw new Error('Cannot locate the content directory');
    directory = parent;
  }
  return directory;
}

import { execFileSync } from 'node:child_process';
import {
  createReadStream,
  createWriteStream,
  mkdirSync,
  readFileSync,
  writeFileSync,
  copyFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import { createGzip } from 'node:zlib';
import { pipeline } from 'node:stream/promises';
import { createHash } from 'node:crypto';
import { findRoot } from '../apps/api/src/paths.js';

const root = findRoot();
const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version as string;
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Invalid release version');
const directory = resolve(root, '.local/release');
mkdirSync(directory, { recursive: true });
const name = `llm-zero-to-one-${version}.tar`;
const archive = resolve(directory, name);
execFileSync('git', ['archive', '--format=tar', 'HEAD', '-o', archive], { cwd: root });
execFileSync('tar', ['-rf', archive, 'apps/web/dist', 'apps/api/dist'], { cwd: root });
await pipeline(createReadStream(archive), createGzip(), createWriteStream(`${archive}.gz`));
copyFileSync(
  resolve(root, 'data/upstream/manifest.json'),
  resolve(directory, 'source-manifest.json'),
);
const composeFiles = ['compose.yaml', 'compose.cuda.yaml', 'compose.dev.yaml'];
for (const file of composeFiles) copyFileSync(resolve(root, file), resolve(directory, file));
const files = [`${name}.gz`, 'source-manifest.json', ...composeFiles];
writeFileSync(
  resolve(directory, 'SHA256SUMS'),
  files
    .map(
      (file) =>
        `${createHash('sha256')
          .update(readFileSync(resolve(directory, file)))
          .digest('hex')}  ${file}`,
    )
    .join('\n') + '\n',
);
console.log(`Packaged ${files.join(', ')} and SHA256SUMS in ${directory}`);

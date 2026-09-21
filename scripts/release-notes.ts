import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { findRoot } from '../apps/api/src/paths.js';

const root = findRoot();
const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version as string;
const tag = `v${version}`;
const repository = 'https://github.com/aiwindyjm/LLM-Zero-To-One';
const existing = execFileSync('gh', ['release', 'view', tag, '--json', 'body', '--jq', '.body'], {
  encoding: 'utf8',
});
const marker = '<!-- installation-and-scope -->';
const body = `${existing.split(marker)[0].trim()}\n\n${marker}
## Install / 安装

Download \`llm-zero-to-one-${version}.tar.gz\` and verify it against \`SHA256SUMS\`. Extract the archive, install Node.js 24 and pnpm 10.34.5, then run:

\`\`\`bash
pnpm install --frozen-lockfile
pnpm start
\`\`\`

Open http://127.0.0.1:4310. Prepare experiments separately with \`pnpm experiment:setup --cpu\` (CPU) or \`pnpm experiment:setup\` (NVIDIA CUDA; Linux/WSL Ubuntu required).

解压后安装锁定依赖并启动；实验环境单独准备。下载包包含源码与预构建 Web/API，不包含 Python 环境、个人学习数据或模型权重。

## Capabilities and limitations / 能力与限制

- [Delivered scope and known limitations / 本版范围与限制](${repository}/blob/${tag}/docs/PRD.md)
- [English guide](${repository}/blob/${tag}/README.md) · [中文说明](${repository}/blob/${tag}/README.zh-CN.md)
- [Validation evidence / 验证记录](${repository}/blob/${tag}/docs/VALIDATION.md)
- [Pinned source manifest / 源码快照清单](${repository}/blob/${tag}/data/upstream/manifest.json), also attached as \`source-manifest.json\`.

The sample validates real model data flow with random weights and synthetic IDs; it does not demonstrate language capability. Tutor requires an optional server-side API key; live-provider verification is only claimed when recorded in the validation evidence.
`;
const path = resolve(root, '.local/release/RELEASE-NOTES.md');
writeFileSync(path, body);
execFileSync('gh', ['release', 'edit', tag, '--notes-file', path], { stdio: 'inherit' });

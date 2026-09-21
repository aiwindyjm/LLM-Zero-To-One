# LLM-Zero-To-One

**Learn LLMs by reading, running, and understanding real code.**

[简体中文](README.zh-CN.md) · [Product specification](docs/PRD.md) · [Architecture](docs/ARCHITECTURE.md) · [Releases](https://github.com/aiwindyjm/LLM-Zero-To-One/releases)

A local, open-source learning workspace built around **nanochat**. Follow a teaching tree instead of guessing where to start in an engineering directory. Move between guided explanations, pinned source code, and an interactive knowledge/code graph without losing context.

## Interactive textbook

- A three-panel workspace: learning sequence → guide/source/graph → concepts and original references.
- One complete five-step lesson tracing Token IDs through the real `GPT.forward` to next-token scores.
- Source snapshots pinned to a full commit, verified checksums, and the actual upstream commit diff.
- An interactive minimum-learning-loop graph linking concepts, files, methods, code blocks, and experiments.
- One-click local CPU/CUDA experiments with logs, cancellation, deadlines, and saved results.
- SQLite progress and assessment history. Objective checks are distinguished from unreviewed explanations.
- An optional, context-grounded Tutor using your own Chat Completions-compatible API.

The remaining seven curriculum modules are **planned**, not completed courses. The sample runs a small configuration of the same real model class with random weights and synthetic IDs; it demonstrates data flow, not trained language ability.

## Docker quick start

Start Docker Desktop with Linux containers. Clone this repository, then run `docker compose pull` and `docker compose up -d --no-build --wait`. Open http://127.0.0.1:4310. For NVIDIA GPUs, use `docker compose -f compose.yaml -f compose.cuda.yaml` for both commands. CPU is the default experiment device.

The platform resumes with Docker Desktop (`unless-stopped`); dependencies are already in the image. [Bilingual Docker guide](docs/DOCKER.md) covers development hot reload, migration, backup, upgrades and troubleshooting.

The five steps now link interactive tensor diagrams, source anchors and inline experiments. Real sampled values are labelled as replay; illustrative and historical data remain distinct. Shape checks explicitly select a B=2/T=8 run, and written reflections are optional.

## Native quick start

Requirements: Node.js 24 LTS, pnpm 10.34.5, Git. For experiments: Linux, or Windows with WSL Ubuntu; the setup command installs an isolated Python 3.12 environment. JavaScript-only reading works before Python setup.

```bash
git clone https://github.com/aiwindyjm/LLM-Zero-To-One.git
cd LLM-Zero-To-One
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm install --frozen-lockfile
pnpm dev
```

Open http://127.0.0.1:5173. If Corepack is unavailable, install pnpm using `npm install -g pnpm@10.34.5`. No database service or account is required.

Prepare experiments once in another terminal:

```bash
pnpm experiment:setup --cpu
```

For an NVIDIA CUDA installation, use `pnpm experiment:setup` instead. CUDA dependencies require several GB of download/storage. On Windows, the GPU must be visible to `nvidia-smi` inside WSL. The default distro is `Ubuntu`; override `LLM_WSL_DISTRO` in `.env` if needed. Re-run setup when changing between CPU/CUDA installations.

Then open **运行实验** in the workspace. A synthetic batch flows through the pinned model, and the measured shapes are saved locally. Setup is explicit; the Run button never installs software.

## Optional Tutor

Copy `.env.example` to `.env` and set `TUTOR_BASE_URL`, `TUTOR_MODEL`, and `TUTOR_API_KEY`. Restart the server. The key stays on the server. The model must support the Chat Completions-compatible endpoint; a real provider call is only verified when credentials are configured.

Reading, experiments, and objective assessment work without the Tutor. AI explanations are not treated as source facts.

## Production / release bundle

```bash
pnpm build
pnpm start
```

Open http://127.0.0.1:4310. Downloadable release bundles include the source, prebuilt frontend/API, a source manifest, and checksums; install dependencies with `pnpm install --frozen-lockfile`, then run `pnpm start`. Python setup is still required for experiments. This release is a local single-user application, not a public multi-user server.

## Develop and contribute

```bash
pnpm check
pnpm exec playwright install chromium
pnpm test:e2e
pnpm experiment:verify
pnpm experiment:verify --cuda
pnpm release:check --message "feat(content): add a lesson"
```

See [Contributing](CONTRIBUTING.md), [curriculum](docs/CURRICULUM.md), [release policy](docs/RELEASING.md), [setup details](docs/SETUP.md), and [validation evidence](docs/VALIDATION.md). Obsidian can open `content/` directly. Source hashes and graph references are checked by `pnpm content:check`.

Native learning records are stored in `.local/data/learning.db`; Docker uses a named volume. Use `pnpm data backup <new-file>` or container export for a consistent SQLite snapshot. Credentials, private learner records, environments, and checkpoints are excluded from Git and release artifacts.

## Release roadmap

| Version | Milestone                                                       |
| ------- | --------------------------------------------------------------- |
| 0.1     | Workspace, graph, complete sample, local runner, optional Tutor |
| 0.2     | Interactive textbook, tensor replay, Docker workspace           |
| 0.3     | Data and core-model lessons                                     |
| 0.4     | Small-scale training, checkpoints, evaluation                   |
| 0.5     | SFT, inference, and chat                                        |
| 1.0     | Verified end-to-end curriculum                                  |

Conventional Commits feed a release PR. Merging that PR after acceptance creates the GitHub Release; ordinary commits do not directly publish.

## License and attribution

Program code: [MIT](LICENSE). Original educational content: [CC BY-SA 4.0](LICENSE-CONTENT.md). Upstream nanochat source retains its [MIT license](data/upstream/nanochat/LICENSE); see [third-party notices](THIRD_PARTY_NOTICES.md). This independent project is not affiliated with or endorsed by upstream authors.

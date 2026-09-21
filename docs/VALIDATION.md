# Validation evidence

This document distinguishes checks that have actually run from remaining acceptance work. Browser fixtures are not model evidence.

## v0.2 implementation checks

- Five interactive diagrams, explicit assessment evidence selection, optional explanations and legacy results pass two Chromium flows at 1366×768 and 390×844. The Embedding first-screen screenshot was inspected: question, interactive lookup and source are visible together.
- `pnpm check` passed with 21 unit/API tests and no lint warnings. Two browser flows also verify diagram selection survives source navigation. Seven Python tests pass in the managed WSL environment and the CPU container, including consistent WAL backup and import preservation.
- Real WSL CPU trace: 0.2442 seconds. RTX 3080 bfloat16 trace: 1.1746 seconds and 10.08 MiB peak tensor allocation. Six sampled positions and actual top-five probabilities are recorded; these are observations, not performance benchmarks.
- A clean local CPU container completed HTTP model execution (0.0227 seconds), active cancellation, interruption on container restart, and persistence of successful/cancelled records. A short deadline test invoked the real Python supervisor and left no Python child behind. A browser launched another real CPU experiment and displayed measured Embedding slices.
- Consistent native backup, container export, stopped-target import and previous-target preservation were exercised. The imported historical records remain available. The image runs as UID 1000, publishes only `127.0.0.1:4310`, and has `unless-stopped` restart policy.
- Compose Watch was exercised with temporary frontend and curriculum edits: Vite served the updated module and the restarted API returned the updated curriculum. All temporary edits were reverted. Learning/development volumes are distinct; the development container was stopped after validation.
- Linux CI passed application/browser tests, the real CPU experiment and clean container build/execution. Docker Hub resolution failed locally; an official public ECR mirror supplied the Node base. NVIDIA libraries now resolve from PyPI at unchanged versions; PyTorch still uses its explicit official index.
- With explicit user authorization, Docker Desktop was stopped and its approximately 64 GB data disk moved from C: to D:. Disk bytes and SHA-256 were verified before retiring the original disk files. The original unrelated D: disk and E: database backups were preserved. Active disk, build cache, named volumes, Desktop logs/configuration/UI cache, CLI state and updater downloads now reside on D:; program binaries and small Windows runtime metadata remain on C:.
- Docker Desktop was restarted after migration. The filesystem recovered read/write, the learning container resumed automatically with a healthy API, and the two previously running unrelated containers resumed. The intentionally stopped development container stayed stopped. Desktop login startup is enabled. Approximately 60 GiB was recovered on C:. A Windows MSIX AppData redirection issue required launching Desktop from a normal Windows process; the active native settings explicitly select the D: disk.
- The CUDA image built successfully after recovery. Its real HTTP RTX 3080 experiment passed in 0.6275 seconds with 10.08 MiB peak PyTorch tensor allocation. Active cancellation, interruption on container restart, and successful/cancelled result persistence passed. All seven Python tests also passed inside this CUDA image. The existing GPU workload remained running; no device was silently substituted. These single-run timings are observations, not benchmarks, and exclude Python imports and driver/context allocation.
- A cold environment probe during concurrent recovery/build exceeded its 30-second deadline and returned the explicit unavailable state. A subsequent real CPU run succeeded (0.3919 seconds), cancellation passed, and pre-migration results remained readable. Dockerfile source ownership is now assigned during copy, with only writable parent directories adjusted; this avoids recursively rewriting installed dependency layers on every source rebuild.
- The optimized Dockerfile passes non-root production and development execution. The rebuilt CUDA image also completed a CPU HTTP experiment (0.0165 seconds), and a real browser launched CUDA and displayed measured tensor replay. In the rebuilt development image, a frontend text change appeared in the browser with an unchanged container start time; a curriculum change triggered Compose Watch restart and appeared through the API. All temporary validation edits were reverted.
- v0.2.0 publication completed at commit `3ce8a5b9fbab465e714885dd8ac4c544f9b2ed84`. The GitHub Release contains the source archive, SHA256SUMS, source manifest, and the three Compose files. The release workflow completed JavaScript/browser/CPU acceptance and published both `0.2.0-cpu` and `0.2.0-cuda` image jobs successfully.
- Host storage follow-up: Ubuntu WSL is registered with `BasePath=D:\WSL`; Docker's `docker-desktop` distribution uses the migrated D: Docker disk. Ollama's large model root is `D:\Ollama\Models` via `OLLAMA_MODELS`. The Ollama executable and small Windows application metadata remain on C: by design.

## Executed during initial implementation

- Source validation: five teaching steps, 24 graph nodes, all pinned source SHA-256 checksums, source ranges, knowledge references and prerequisite graphs passed.
- TypeScript checking and production build passed before the final release review.
- Final unit/integration suite: 19 passing tests covering content, execution input validation, local API boundaries, SQLite persistence, objective assessment, job queue/cancel/timeout/OOM/shutdown, Tutor parsing/citation checks, and release policy.
- Chromium acceptance: two passing flows covering guide/source/diff/graph linking, theme and location restore, experiment UI, assessment persistence, unconfigured Tutor, and narrow-screen drawers.
- Desktop screenshot inspected at 1440 × 1000. Browser automation uses clearly identified worker fixtures; it does not claim real hardware execution.

## Real hardware evidence

- Windows + WSL Ubuntu, isolated Python 3.12.14, PyTorch 2.9.1+cu128; unchanged nanochat commit `92d63d4e8bb4df75c3b71618f31ddde2378b2bcd`.
- CPU float32: 0.2482 seconds; RTX 3080 bfloat16: 0.9379 seconds and 10.08 MiB peak PyTorch tensor allocation. These are single observations including model initialization and forward computation, excluding Python startup/imports. They are not comparative performance benchmarks; CUDA context/driver memory is not included in tensor allocation.
- Both runs: B=2, T=8, C=128, V=256, two layers, 491,598 parameters; logits `(2,8,256)`, next-token shape `(2)`, normalized probabilities. Random weights and synthetic IDs have no measured language capability.
- A real browser launched CUDA at T=16 through Fastify/WSL: persisted status `succeeded`, logits `(2,16,256)`, 0.9136 seconds and 10.12 MiB peak tensor allocation. The experiment dialog showed streamed logs and the saved result; its screenshot was inspected.
- A second browser run was cancelled using the Stop button. WSL had no remaining experiment/supervisor process. After restarting the production API, both the cancelled record and earlier successful CUDA result remained available in the browser.
- Five real Python tests passed, including sequence lengths 8, 16 and 32, checksum validation and rejected inputs. PyTorch emits an optional NumPy-unavailable warning; this experiment does not use NumPy conversion.
- `pnpm check` passed formatting, lint, types, all 19 tests and production build. Two Chromium flows passed, including explicit graph-method navigation to source and narrow-screen keyboard dismissal.

## Publication verification

- [Release PR #1](https://github.com/aiwindyjm/LLM-Zero-To-One/pull/1) updated the product version to 0.1.0 and passed [PR CI](https://github.com/aiwindyjm/LLM-Zero-To-One/actions/runs/35563621835) and explicitly dispatched [release-branch verification](https://github.com/aiwindyjm/LLM-Zero-To-One/actions/runs/35563621316).
- [The release workflow](https://github.com/aiwindyjm/LLM-Zero-To-One/actions/runs/35563774412) passed JavaScript/browser checks and the real Linux CPU experiment/Python tests, then created [v0.1.0](https://github.com/aiwindyjm/LLM-Zero-To-One/releases/tag/v0.1.0) at commit `1352a18caa062ba9e11798103e2c4406a428c9e2`.
- All three published assets were downloaded: `llm-zero-to-one-0.1.0.tar.gz`, `source-manifest.json`, and `SHA256SUMS`. Both payload checksums matched. Archive SHA-256: `6f3c799718306aaee8e206d90d52288a670cd48316588580d8d2c2de8b3a8a0d`.
- The downloaded archive was extracted into an independent directory with no existing `node_modules` or database. `pnpm install --frozen-lockfile` succeeded; the prebuilt production API and SPA started, served all five steps, and completed a real CPU experiment through the HTTP job API using the prepared WSL environment (0.2675 seconds, logits `(2,8,256)`). Fresh Python environment preparation also passed in Linux CI.
- These post-publication checks are recorded after the immutable release was built; the archive itself contains the earlier, honestly pending publication checklist. No release tag or payload was rewritten to imply prior verification.

## Tutor boundary

No real model provider credentials have been supplied. Compatible HTTP/SSE behavior, failure handling, and citation-ID validation are tested with fixtures. No successful real-provider invocation is claimed.

## Reproduce

Run `pnpm check`, `pnpm test:e2e`, `pnpm experiment:verify`, and `pnpm experiment:verify --cuda`. Real experiment JSON is written to `.local/validation/`. GPU results vary by hardware and load; numeric evidence will be recorded after measurement, not inferred from specifications.

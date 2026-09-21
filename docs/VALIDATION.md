# Validation evidence

This document distinguishes checks that have actually run from remaining acceptance work. Browser fixtures are not model evidence.

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

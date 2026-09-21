# Project instructions

Build a source-grounded learning platform, following `docs/PRD.md` and `docs/ARCHITECTURE.md`.

- Keep the original `LLM-Zero-To-One.md` as the vision document. The PRD defines the current release scope.
- Use React/TypeScript/Vite, Zustand for UI state, TanStack Query for server state, and SQLite for persistent learning facts.
- Curriculum content lives in `content/`. Obsidian opens that directory; never create a second copy of the curriculum.
- Every source reference must resolve to the pinned upstream commit and a verified file range. Preserve third-party licenses.
- Never invent source evidence, experimental results, successful checks, or AI-provider verification.
- Keep platform implementation and learner-facing Tutor instructions separate. Tutor prompts live with the API, not in this file.
- Make focused changes. Run `pnpm check` before delivery; run relevant unit, integration, and browser tests after behavioral changes.
- Use `pnpm experiment:setup` to provision the isolated Python environment. Never install dependencies as a hidden effect of starting an experiment.
- Never execute browser-supplied shell commands. Runner input is restricted to the shared experiment schema.
- Run `pnpm release:check` before every commit and report the version impact. Follow `docs/RELEASING.md`.
- Use Conventional Commits: new lessons are `feat(content)`, factual corrections are `fix(content)`.
- Keep credentials, databases, downloaded environments, checkpoints, and private learner data out of Git.
- Verify UI changes in a real browser, including narrow layouts and keyboard interaction.
- Keep these rules concise. Put architecture decisions, setup details, and release procedures in their linked documents.

## Commands

- `pnpm install --frozen-lockfile`: install JavaScript dependencies.
- `pnpm dev`: start the local API and Vite frontend.
- `pnpm check`: content validation, formatting, lint, types, tests, and build.
- `pnpm test:e2e`: browser acceptance tests.
- `pnpm experiment:setup`: prepare the isolated CPU/CUDA runner.
- `pnpm experiment:verify`: run the real pinned model on CPU; append `--cuda` for GPU evidence.

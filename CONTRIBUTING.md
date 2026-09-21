# Contributing

[简体中文](CONTRIBUTING.zh-CN.md)

Contributions may improve explanations, experimental evidence, references, accessibility, translations, or platform code. You do not need to contribute a model implementation.

## Workflow

For container development, use `docker compose -f compose.dev.yaml up --build --watch` and open port 5173. The [Docker guide](docs/DOCKER.md) documents isolated volumes and source synchronization. Changes to diagrams must preserve authored source anchors; replay samples must never be fabricated.

1. Read `AGENTS.md`, the PRD, and the architecture document. Keep changes within the current milestone.
2. Install with `pnpm install --frozen-lockfile` and start with `pnpm dev`.
3. Make a focused change and update any affected lesson anchors, graph relationships, experiments, and assessments together.
4. Run `pnpm check`. For UI behavior, run `pnpm test:e2e` and inspect desktop/narrow screenshots. For Python behavior, prepare the environment and run the real experiment and pytest suite.
5. Run `pnpm release:check --message "feat(scope): description"` before committing. Use a descriptive Conventional Commit title.
6. Open a PR using the template. State validation actually performed and distinguish fixtures from real model runs.

## Adding teaching content

Use the existing five-step lesson and `content/TEMPLATE.md` as a template. Draft the objective and acceptance evidence first. Map it to a real pinned commit, files and methods; then write explanations and references. A `calls` relationship must have a source anchor. Curriculum dependencies must be acyclic.

The first release activates only `nanochat-forward`. A new active lesson also requires updating the catalog registration, shared request validation, API routing, and tests; do not merely change a planned chapter to available. Discuss that activation work as part of the 0.2 milestone.

New lessons use `feat(content)`. Corrections that affect learning correctness use `fix(content)`. Wording or repository maintenance usually uses `docs` or `chore`.

## Evidence and AI assistance

Do not label generated explanations as source facts. Verify the exact code version and official references. State substantial AI assistance in your PR and identify anything not yet verified. AI output is not a substitute for a passing test or a real experiment.

Never submit credentials, learner databases, private conversations, checkpoints, or unlicensed datasets. Keep upstream snapshots unmodified; update their manifest and license notices when intentionally moving versions.

## License

Contributions to program code use MIT. Original curriculum contributions use CC BY-SA 4.0. Third-party materials keep their original terms. By submitting a contribution you confirm that you have the right to contribute it under the applicable license.

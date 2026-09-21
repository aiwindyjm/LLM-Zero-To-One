# Release policy / 发布策略

Git commits and tags alone are not a GitHub Release. This project uses **Release Please** to maintain a version/changelog PR and creates a real release only after that PR is merged and checks pass.

## Before every commit

Run `pnpm release:check --message "type(scope): description"` and record the impact in the PR. Run appropriate tests; use `pnpm check` before delivery.

| Change                                      | Commit                            | 0.x effect            |
| ------------------------------------------- | --------------------------------- | --------------------- |
| New platform behavior or lesson             | `feat(...)`                       | minor                 |
| Behavior bug or factual teaching correction | `fix(...)`                        | patch                 |
| Breaking behavior/schema                    | `type(...)!` plus migration notes | minor                 |
| Maintenance, tests, ordinary docs           | `docs/chore/test/...`             | no standalone release |

Use `feat(content)` for new lessons and `fix(content)` for correctness changes. A release PR may collect many commits; its merge is the deliberate release point. Do not manually bump product versions on feature branches.

## Milestones

| Target | Acceptance                                                                                                   |
| ------ | ------------------------------------------------------------------------------------------------------------ |
| v0.1.0 | Three-panel workspace, graph, one complete sample, local runner, persistence, optional Tutor, bilingual docs |
| v0.2.0 | Interactive textbook, real tensor replay, Docker learning/development                                        |
| v0.3.0 | Continuous data and core-model lessons                                                                       |
| v0.4.0 | RTX 3080 small training, checkpointing and evaluation                                                        |
| v0.5.0 | SFT, inference and chat loop                                                                                 |
| v1.0.0 | End-to-end curriculum with reproducibility and learning validation                                           |

Patch versions can be released between milestones. 1.0 is a deliberate acceptance decision, not a calendar deadline. Planned modules remain marked planned until their content and experiments are verified.

## Automation

1. Feature PRs run CI and conventional-title/release-impact checks.
2. Main pushes run the release workflow's full acceptance checks: JavaScript, content, browser and a real CPU experiment.
3. Release Please creates/updates a release PR using `GITHUB_TOKEN`.
4. The workflow explicitly dispatches `verify.yml` on the release branch, so checks do not depend on token-created events automatically triggering another workflow.
5. After reviewing the milestone evidence, merge the release PR. Its main workflow creates the version tag and GitHub Release.
6. That same workflow packages source plus prebuilt Web/API, Compose files, manifest and checksums, then builds CPU/CUDA images in separate jobs, executes a real CPU experiment in each and publishes versioned GHCR tags. Local GPU execution is a separate acceptance requirement. Image jobs run in the release workflow, not on a token-generated tag event; retries reuse the immutable release commit. Verify anonymous image pulls and package visibility after the first publication.

The root `package.json` is the single product version. Workspace packages are private and are not published to npm. All actions are pinned to commit SHAs.

Repository settings must allow GitHub Actions to create pull requests. Workflow permissions are explicit; no PAT is required. Enable required checks and squash merging where supported. In this project's initial setup, the owner creates the repository and verifies the first release end to end.

## Release checklist

- Content hashes/anchors/graph relationships are valid.
- CI and real CPU experiment pass for the release commit.
- Relevant GPU changes have real hardware evidence in `docs/VALIDATION.md`.
- README, changelog, setup and known limitations match delivered capabilities.
- Migration notes exist for persistent-format or API incompatibilities.
- No keys, learner records, downloaded environments or checkpoints are tracked.
- GitHub Release page, tag, version and all download assets are checked after publication.

If asset upload fails after the release is created, rerun the release workflow at the same main commit. It verifies that the version tag points to that commit and uploads idempotently with `--clobber`. Never move an already published tag to hide a failure; publish a corrective patch for code changes.

每次提交都判断版本影响，但不会每次提交都发布。发布 PR 是明确的验收节点。GPU 未实测、教材尚未完成或 API 未配置时，必须如实记录，不得把模拟结果写成发布证据。

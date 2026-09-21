# 贡献指南

[English](CONTRIBUTING.md)

欢迎改进解释、实验、资料关联、无障碍体验、翻译或平台代码。贡献不要求编写模型实现。

## 开发流程

容器开发运行 `docker compose -f compose.dev.yaml up --build --watch`，访问 5173。独立数据卷与代码同步详见 [Docker 指南](docs/DOCKER.md)。修改图解须同步维护源码锚点，实测回放不能补造未采集的数值。

1. 阅读 `AGENTS.md`、PRD 和架构文档，确认本次修改所属里程碑。
2. 运行 `pnpm install --frozen-lockfile`、`pnpm dev`。
3. 一次解决明确问题。修改教学内容时同步检查源码锚点、知识关系、实验和验收。
4. 运行 `pnpm check`。UI 行为变更运行 `pnpm test:e2e` 并检查桌面与窄屏；Python 变更运行真实实验与 pytest。
5. 提交前运行 `pnpm release:check --message "feat(scope): description"`，使用 Conventional Commit 标题。
6. 按 PR 模板说明影响和实际验证，区分模拟测试与真实模型运行。

## 添加课程

参考 `content/TEMPLATE.md` 和现有五步样板课。先写学习目标与可观察的验收依据，再映射真实 Commit、文件与方法，最后撰写解释和资料关联。调用关系必须有源码证据，前置依赖不能成环。

首版只启用 `nanochat-forward`。启用新课还需要扩展内容注册、共享请求校验、API 和测试，不能只把“计划中”改成“可用”。这部分按 0.2 里程碑评审。

新课使用 `feat(content)`；影响理解正确性的纠错使用 `fix(content)`；普通说明调整使用 `docs` 或 `chore`。

## 可信度与 AI 协作

AI 生成内容不是源码事实。核对确切版本与原始资料；在 PR 中说明主要 AI 协助和仍未验证的内容。不要将生成的日志或模拟测试结果当成真实实验。

不要提交密钥、私人学习记录、对话、Checkpoint 或无权再分发的数据集。上游快照保持原样，升级版本时同步更新哈希和许可证声明。

代码贡献采用 MIT，原创教材贡献采用 CC BY-SA 4.0，第三方材料沿用原有条款。提交贡献意味着你有权按对应许可证提供这些内容。

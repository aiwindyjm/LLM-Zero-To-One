# LLM-Zero-To-One

**从真实源码开始，真正理解大语言模型。**

[English](README.md) · [产品需求](docs/PRD.md) · [架构](docs/ARCHITECTURE.md) · [版本发布](https://github.com/aiwindyjm/LLM-Zero-To-One/releases)

以 **nanochat** 为贯穿主线的本地开源学习工作区。左侧按理解顺序组织课程，中间联动导学讲解、真实源码和关系网络，右侧关联知识与原始资料。一个原理涉及哪些文件和方法，可以直接在网络中追踪。

## 交互教材可以做什么

- 完成五个步骤的真实前向计算样板课：输入 → Embedding → Block → Logits → 下一 Token。
- 查看固定 Commit 的完整源码、精确行号、实际 Commit Diff 与引用证据。
- 在交互图中查看当前知识点的最小闭环，以及整课的文件、方法、知识和实验关系。
- 从网页运行 CPU/CUDA 实验，查看实时日志、停止任务、保存结果。
- 在 SQLite 中保留学习进度和验收历史，明确区分客观验证与尚未评审的个人解释。
- 可选配置远程 API Tutor；不配置也能阅读、实验和完成基础验收。

已发布 v0.2 镜像包含第一课。当前源码的 v0.3 开发增量新增《文本如何变成训练批次》：真实分词、组批和右移目标三步，使用原创微型文本和 CPU 实验。切换课程时隔离进度、验收、实验与 Tutor 历史，其余六个模块仍为**路线规划**。第二课需从当前源码构建；`pnpm experiment:verify --data` 验证真实数据实验。第一课仍使用随机权重和合成 Token ID，不代表已训练出有语言能力的模型。

## Docker 快速开始

启动 Docker Desktop，使用 Linux containers。克隆仓库后运行 `docker compose pull` 和 `docker compose up -d --no-build --wait`，访问 http://127.0.0.1:4310。NVIDIA GPU 安装在两条命令中都使用 `docker compose -f compose.yaml -f compose.cuda.yaml`。样板课默认 CPU，可显式切换 CUDA。

平台随 Docker Desktop 恢复（`unless-stopped`），依赖已包含在镜像中。开发热更新、迁移、备份、升级和故障处理见[双语 Docker 指南](docs/DOCKER.md)。

五个步骤通过可操作张量图解联动真实源码和内嵌实验；实测切片明确标为回放，与示意和历史数据区分。客观验收显式选择 B=2/T=8 的运行记录，解释可选填写。

## 原生快速开始

安装 Node.js 24 LTS、pnpm 10.34.5 和 Git。运行实验需要 Linux，或带 Ubuntu 的 Windows WSL；环境准备命令会安装独立的 Python 3.12。只读教材时不需要先安装 Python 环境。

```bash
git clone https://github.com/aiwindyjm/LLM-Zero-To-One.git
cd LLM-Zero-To-One
corepack enable
corepack prepare pnpm@10.34.5 --activate
pnpm install --frozen-lockfile
pnpm dev
```

访问 http://127.0.0.1:5173。如果没有 Corepack，可用 `npm install -g pnpm@10.34.5` 安装 pnpm。不需要账户或额外数据库服务。

另开终端，一次性准备实验环境：

```bash
pnpm experiment:setup --cpu
```

使用 NVIDIA GPU 时改为 `pnpm experiment:setup`。CUDA 依赖需要下载、存储数 GB 文件；Windows 下先确保 WSL 中的 `nvidia-smi` 能识别显卡。默认发行版为 Ubuntu，其他名称可在 `.env` 设置 `LLM_WSL_DISTRO`。在 CPU/CUDA 安装之间切换时重新运行对应命令。

回到网页点击“运行实验”，选择设备和序列长度。网页不会暗中安装依赖；缺少环境时会展示明确说明。

## 可选 AI Tutor

复制 `.env.example` 为 `.env`，填写 `TUTOR_BASE_URL`、`TUTOR_MODEL`、`TUTOR_API_KEY` 后重启服务。接口需要兼容 Chat Completions。Key 仅由服务端读取；未配置真实凭据时，不宣称已验证实际模型调用。

## 构建与运行发布版本

```bash
pnpm build
pnpm start
```

访问 http://127.0.0.1:4310。GitHub Release 的压缩包包含源码、预构建 Web/API、源码清单和校验和；解压后运行 `pnpm install --frozen-lockfile` 和 `pnpm start`。实验仍需独立准备 Python 环境。本版为本机单用户服务，不应作为公开多用户服务器运行。

## 开发与贡献

```bash
pnpm check
pnpm exec playwright install chromium
pnpm test:e2e
pnpm experiment:verify
pnpm experiment:verify --cuda
pnpm release:check --message "feat(content): add a lesson"
```

阅读[贡献指南](CONTRIBUTING.zh-CN.md)、[课程地图](docs/CURRICULUM.md)、[发布策略](docs/RELEASING.md)、[环境说明](docs/SETUP.md)和[验证记录](docs/VALIDATION.md)。Obsidian 直接打开 `content/`，Web 使用同一内容源。

原生学习记录保存在 `.local/data/learning.db`，Docker 使用命名卷。通过 `pnpm data backup <新文件>` 或容器导出建立一致 SQLite 备份。数据库、Key、下载环境和模型 Checkpoint 不进入 Git 或发布包。

## 发布路线

| 版本 | 里程碑                                             |
| ---- | -------------------------------------------------- |
| 0.1  | 三栏工作区、关系网络、样板课、一键实验、可选 Tutor |
| 0.2  | 交互教材、张量回放、Docker 工作空间                |
| 0.3  | 数据与模型核心课程                                 |
| 0.4  | 小规模训练、Checkpoint 和评估                      |
| 0.5  | SFT、推理和聊天闭环                                |
| 1.0  | 经过系统验证的完整主线课程                         |

每次提交判断发布影响。功能和修复进入主线后，由 Release Please 更新发布 PR；满足验收并合并该 PR 后创建真正的 GitHub Release。

## 许可证

程序代码采用 [MIT](LICENSE)，原创教材采用 [CC BY-SA 4.0](LICENSE-CONTENT.md)。上游 nanochat 代码保留[原始 MIT 许可证](data/upstream/nanochat/LICENSE)，其他材料见[第三方声明](THIRD_PARTY_NOTICES.md)。本项目独立维护，不代表上游作者认可或背书。

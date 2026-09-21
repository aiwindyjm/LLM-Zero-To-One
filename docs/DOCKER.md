# Docker workspace / Docker 工作空间

## 日常学习 / Everyday learning

启动 Docker Desktop，使用 Linux containers。Windows GPU 依赖 WSL2 和 NVIDIA 驱动，但日常无需进入 Ubuntu。首次安装：

Start Docker Desktop using Linux containers. Windows GPU support requires WSL2 and compatible NVIDIA drivers. Daily use needs no Ubuntu terminal.

首次构建 CUDA 镜像前，检查 **Docker 数据盘所在的宿主机分区**，不只是源码目录。建议至少预留 30 GB 可用空间供下载、解压、构建缓存和镜像导出；构建多个版本需要更多。空间不足时先通过 Docker Desktop 的 Disk image location 设置迁移到容量充足的磁盘，迁移会中断其他容器。不要删除 Docker 数据盘或学习卷来“修复”空间问题。

Before building CUDA images, check free space on the **host partition containing Docker's disk image**, not only the source directory. Reserve at least 30 GB for downloads, extraction, cache and export; multiple builds need more. If necessary, relocate the disk through Docker Desktop's Disk image location setting before building; this interrupts other containers. Never delete the Docker disk or learning volumes to resolve low space.

```bash
git clone https://github.com/aiwindyjm/LLM-Zero-To-One.git
cd LLM-Zero-To-One
docker compose pull
docker compose up -d --no-build --wait
```

CUDA 镜像包含 CPU 支持，下载更大。将最后两行替换为 / For CUDA (also supports CPU), replace the last two commands:

```bash
docker compose -f compose.yaml -f compose.cuda.yaml pull
docker compose -f compose.yaml -f compose.cuda.yaml up -d --no-build --wait
```

访问 http://127.0.0.1:4310。样板课默认 CPU，实验区显式选择 CUDA。依赖在构建镜像时准备，运行按钮不会安装依赖、停止其他程序或静默切换设备。

Open http://127.0.0.1:4310. CPU is the default; select CUDA explicitly. Dependencies are installed at image build time. Experiments never install software, stop other workloads, or silently switch devices.

在 Docker Desktop 启用登录后自动启动。`restart: unless-stopped` 在 Docker 恢复时启动平台；主动停止后需要 `docker compose start` 恢复。浏览器不会自动打开。宿主机仅发布到 `127.0.0.1`，不挂载 Docker socket。

Enable Docker Desktop startup at login. `restart: unless-stopped` restores the app with Docker, except after a deliberate stop; use `docker compose start` to resume. The browser does not launch automatically. Host ports bind to loopback only; no Docker socket is mounted.

升级前先备份，再在 `.env` 设置 `LLM_VERSION` 为已发布版本，重复相同 CPU/CUDA 的 `pull` 和 `up` 命令。不要使用 `down -v`，它会删除学习卷。v0.2 保留 v0.1 数据；旧实验显示形状，不伪造回放。

Before upgrading, export a backup, set `LLM_VERSION` to a published version in `.env`, then repeat the appropriate `pull` and `up` commands. Never upgrade with `down -v`: it deletes learning data. v0.2 preserves v0.1 records; old experiments retain shapes without fabricated replay values.

## 容器开发 / Development

```bash
docker compose -f compose.dev.yaml up --build --watch
```

访问 http://127.0.0.1:5173。前端热更新，API、契约、教材与 Runner 变更同步后重启开发进程；锁文件和包清单变化重建。Windows `node_modules` 不会进入容器。开发数据独立保存，默认 CPU。Obsidian 直接编辑同一 `content/`。

Open http://127.0.0.1:5173. Frontend changes hot-reload; API, contracts, content and Runner changes sync and restart development processes. Locks and manifests trigger rebuilds. Windows `node_modules` is excluded. Development uses a separate volume and defaults to CPU. Obsidian edits the same `content/` directory.

本地构建学习版 / Build learning images locally:

```bash
docker compose build app
docker compose -f compose.yaml -f compose.cuda.yaml build app
```

## 备份与迁移 / Backup and import

以下宿主机命令需要项目 Node.js/pnpm 依赖（`pnpm install --frozen-lockfile`）。使用 SQLite backup API，可从运行中的源数据库建立一致快照；目标备份文件必须不存在。

These host commands require the repository's Node.js/pnpm dependencies. SQLite backup API creates consistent snapshots while the source runs. Existing backup files are never overwritten.

```bash
pnpm data backup .local/backups/native-before-docker.db
docker compose create app
docker compose stop app
docker compose ps -aq app
pnpm data import .local/backups/native-before-docker.db CONTAINER_ID
docker compose start app
```

将 `CONTAINER_ID` 替换为上一条输出。CUDA 安装始终使用两个 Compose 文件。导入拒绝运行中的目标，保留原生数据库；如目标已有数据库，先备份为卷内 `/data/learning-before-import-TIMESTAMP.db`。导入期间不要启动目标。

Replace `CONTAINER_ID` with the preceding output. Use both Compose files consistently for CUDA. Import rejects running targets, preserves the native database, and backs up any existing target as `/data/learning-before-import-TIMESTAMP.db`. Do not start the target during import.

从运行中的容器导出 / Export from a running container:

```bash
pnpm data export .local/backups/docker-snapshot.db CONTAINER_ID
```

无宿主机 Node 时使用镜像内 Python / Without host Node, use bundled Python:

```bash
docker compose exec app /opt/runner/bin/python runner/data.py backup /data/learning.db /data/my-backup.db
docker compose cp app:/data/my-backup.db ./my-backup.db
```

## 故障定位 / Troubleshooting

- 4310 被占用：确认旧平台进程归属再停止，不停止其他项目。/ Port conflict: identify the old platform process before stopping it; preserve unrelated services.
- GPU 不可用：检查 Docker WSL2 integration、NVIDIA 驱动和网页环境诊断；需要时手动使用 CPU。/ Check WSL2 integration, NVIDIA drivers and in-app diagnostics; choose CPU explicitly if needed.
- 下载失败：检查 Docker Hub、npm、PyPI、PyTorch 索引访问。Docker Desktop 代理与终端代理不同。/ Check registry access; Docker Desktop proxy settings differ from terminal settings.
- 日志 / Logs: `docker compose logs --tail=100 app`; 健康 / health: `docker compose ps`。空闲时不加载模型 / No model is loaded while idle.
- Tutor：在忽略的 `.env` 中运行时注入 `TUTOR_BASE_URL`、`TUTOR_MODEL`、`TUTOR_API_KEY`，变更后重建容器。禁止把 Key 作为 build argument。/ Inject keys at runtime, recreate containers after changes, never bake keys into images.
- 原生 Linux/WSL / Native Linux/WSL: [SETUP.md](SETUP.md).

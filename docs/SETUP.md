# Setup and troubleshooting / 环境说明

Recommended daily use: [Docker learning/development, automatic recovery, upgrades and backup (中英双语)](DOCKER.md). The native setup below remains supported. 推荐日常使用 Docker，下面保留原生 Linux/WSL 方式。

## Application / 平台

Use Node.js 24 LTS and pnpm 10.34.5. Install the exact dependency lock with `pnpm install --frozen-lockfile`. `pnpm dev` starts a loopback API on 4310 and Vite on 5173. `pnpm build && pnpm start` serves the production application on 4310.

The application remains usable for reading before Python is installed. SQLite is created automatically under `.local/data/`. The server only accepts local hostnames/origins and uses a per-process session token for writes; refreshing reconnects after a restart.

平台不需要独立数据库或账户。开发地址为 5173，生产地址为 4310。Python 未准备好时可以先读教材。学习数据保存在 `.local/data/`，备份前请停止服务。

`better-sqlite3` uses a native addon. If no prebuilt binary is available, installation needs the platform's C++ build tools (Visual Studio Build Tools on Windows, build-essential on Linux). Do not disable its install script: the database requires the native addon.

## Python / 实验环境

Run `pnpm experiment:setup --cpu` for CPU, or `pnpm experiment:setup` for CUDA. Linux/WSL needs `python3`, `curl`, and `sh`. The setup script installs uv if missing and creates an isolated managed Python 3.12 environment at `~/.local/share/llm-zero-to-one/venv`. It does not replace system Python. Windows Node invokes the selected WSL distribution using argument arrays, not interpolated shell commands.

Windows needs WSL Ubuntu with working GPU passthrough. Verify inside WSL using `nvidia-smi`. Set `LLM_WSL_DISTRO` in `.env` if your distro has another name. Python environments live on Linux storage, even when the repository is on a mounted Windows drive.

On this machine the Ubuntu WSL distribution is registered at `D:\WSL`, so its virtual disk and the managed Python environment are stored on D:. Docker Desktop has a separate D: data disk configured through `CustomWslDistroDir`; do not confuse the Docker `docker-desktop` distribution with the Ubuntu learning distribution.

Ollama model files are stored at `D:\Ollama\Models` through the user environment variable `OLLAMA_MODELS`. Ollama's executable remains installed under the Windows user program directory; changing the model root keeps large model blobs off C: without moving the program installation.

在 CPU/CUDA 安装之间切换时，重新运行对应 setup 命令。CUDA 依赖下载量为数 GB，首次准备明显慢于以后运行。网页的“重新检查环境”刷新诊断；诊断缓存最长 15 秒。

The lockfile pins Python dependencies. `--refresh-lock` intentionally re-resolves dependencies for maintainers; review the resulting lock diff and rerun experiments before committing. Normal installations use `--frozen`.

## Experiments / 实验

The first preset imports actual pinned nanochat modules, uses synthetic integer IDs and random weights, and disables compilation for short teaching runs. Optional external FA3 kernels are not installed; the unmodified upstream implementation falls back to PyTorch SDPA. No dataset or checkpoint is downloaded when running the sample.

- Allowed sequence lengths: 8, 16, 32. Batch size 2, width 128, two layers, vocabulary 256.
- CPU uses float32; CUDA uses bfloat16. RTX 3080 is an Ampere device; actual GPU evidence is documented separately.
- Maximum runtime: 120 seconds. One active task; up to 10 queued tasks.
- Stopping or disconnecting the supervisor terminates the experiment process group.
- OOM is a failure with logs, not an automatic success or silent preset change.
- A process interrupted by server restart must be rerun; completed results remain in SQLite.

“CUDA 峰值分配显存”由 PyTorch 统计，不包含其他进程占用，也不是整张显卡的总占用。“计算耗时”包括模型初始化和前向运算，不包括 Python 导入和进程启动。

## Tutor / 教学助手

Configure `.env` from `.env.example` and restart. The endpoint is `${TUTOR_BASE_URL}/chat/completions`; set a model that supports it. API keys stay server-side. The configured server must support streaming SSE, or return a standard non-streaming Chat Completions response.

未配置 Key 时，Tutor 返回明确提示，其他功能正常。提示模式不直接提供验收答案。引用校验检查来源 ID 是否在当前上下文中，不等于证明 AI 的每个论断正确。

## Validation / 检查

`pnpm check` validates content, formatting, lint, types, unit/integration tests and build. Install Chromium with `pnpm exec playwright install chromium` before `pnpm test:e2e`.

`pnpm experiment:verify` runs the real CPU model; add `--cuda` for GPU. JSON evidence is written to `.local/validation/`, never fabricated from browser fixtures. Run Python tests using `~/.local/share/llm-zero-to-one/venv/bin/python -m pytest runner/tests -q` inside Linux/WSL from the project directory.

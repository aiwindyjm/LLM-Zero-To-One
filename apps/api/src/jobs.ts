import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { createInterface } from 'node:readline';
import { stripVTControlCharacters } from 'node:util';
import {
  experimentResultSchema,
  UPSTREAM_SHA,
  type EnvironmentStatus,
  type ExperimentRequest,
  type ExperimentResult,
} from '@llm/contracts';
import { Store } from './database.js';
import { runnerCommand, type RunnerCommand } from './runner-command.js';

export class JobManager {
  private active: {
    id: string;
    child: ChildProcessWithoutNullStreams;
    reason: string | null;
  } | null = null;
  private queue: string[] = [];
  private closing = false;
  private diagnosis: { value: EnvironmentStatus; time: number } | null = null;

  constructor(
    private readonly root: string,
    private readonly store: Store,
    private readonly command: (diagnostic: boolean) => RunnerCommand = (diagnostic) =>
      runnerCommand(root, 'bootstrap.py', diagnostic ? ['--diagnose'] : []),
    private readonly timeoutMs = 120000,
  ) {}

  async diagnose(): Promise<EnvironmentStatus> {
    if (this.diagnosis && Date.now() - this.diagnosis.time < 15000) return this.diagnosis.value;
    const fallback: EnvironmentStatus = {
      ready: false,
      gpuAvailable: false,
      gpuName: null,
      python: null,
      torch: null,
      commit: null,
      message: '请先在终端运行 pnpm experiment:setup。',
      tutorConfigured: Boolean(process.env.TUTOR_API_KEY && process.env.TUTOR_MODEL),
    };
    const value = await new Promise<EnvironmentStatus>((resolve) => {
      let command: RunnerCommand;
      try {
        command = this.command(true);
      } catch (error) {
        resolve({
          ...fallback,
          message: `无法启动 Python/WSL：${(error as Error).message.split('\n')[0]}`,
        });
        return;
      }
      const child = spawn(command.command, command.args, { windowsHide: true, stdio: 'pipe' });
      let result = fallback;
      const timer = setTimeout(() => {
        child.kill();
        resolve({ ...fallback, message: '环境检查超时，请检查 Python 和 WSL。' });
      }, 30000);
      const lines = createInterface({ input: child.stdout });
      lines.on('line', (line) => {
        try {
          const message = JSON.parse(line);
          if (message.kind === 'diagnostic' && message.commit === UPSTREAM_SHA)
            result = { ...fallback, ...message };
          if (message.kind === 'error') result = { ...fallback, message: String(message.message) };
        } catch {
          result.message = '环境检查返回了无效输出。';
        }
      });
      child.on('error', () => {
        clearTimeout(timer);
        resolve(fallback);
      });
      child.on('close', () => {
        clearTimeout(timer);
        resolve(result);
      });
      child.stdin.end();
    });
    this.diagnosis = { value, time: Date.now() };
    return value;
  }

  enqueue(input: ExperimentRequest) {
    if (this.closing) throw new Error('服务正在关闭');
    if (this.queue.length >= 10) throw new Error('实验队列已满，请稍后再试');
    const run = this.store.createRun(input);
    this.queue.push(run.id);
    this.next();
    return this.store.getRun(run.id)!;
  }

  cancel(id: string) {
    const run = this.store.getRun(id);
    if (!run) return false;
    if (run.status === 'queued') {
      this.queue = this.queue.filter((entry) => entry !== id);
      this.store.updateRun(id, 'cancelled');
    } else if (this.active?.id === id) {
      this.active.reason = 'cancelled';
      this.store.event(id, 'log', '正在停止实验进程…');
      this.active.child.stdin.end(`${JSON.stringify({ kind: 'cancel' })}\n`);
    }
    return true;
  }

  private next() {
    if (this.active || this.closing) return;
    const id = this.queue.shift();
    if (!id) return;
    const run = this.store.getRun(id)!;
    let command: RunnerCommand;
    try {
      command = this.command(false);
    } catch (error) {
      this.store.updateRun(id, 'failed', String(error));
      this.next();
      return;
    }
    const environment = { ...process.env };
    delete environment.TUTOR_API_KEY;
    const child = spawn(command.command, command.args, {
      windowsHide: true,
      stdio: 'pipe',
      env: environment,
    });
    this.active = { id, child, reason: null };
    this.store.updateRun(id, 'running');
    let result: ExperimentResult | null = null;
    let error: string | null = null;
    let experimentExit: number | null = null;
    let eventCount = 0;
    const timer = setTimeout(() => {
      if (this.active?.id !== id) return;
      this.active.reason = 'timeout';
      child.stdin.end(`${JSON.stringify({ kind: 'cancel' })}\n`);
    }, this.timeoutMs);
    const watchdog = setTimeout(() => child.kill(), this.timeoutMs + 6000);
    const lines = createInterface({ input: child.stdout });
    lines.on('line', (line) => {
      if (++eventCount > 500 || line.length > 65536) {
        error = '实验输出超出限制';
        child.stdin.end();
        return;
      }
      try {
        const message = JSON.parse(line);
        if (message.kind === 'log') this.store.event(id, 'log', String(message.message));
        if (message.kind === 'error') error = String(message.message);
        if (message.kind === 'result') {
          result = experimentResultSchema.parse(message.result);
          if (
            result.sequenceLength !== run.sequenceLength ||
            (run.experimentId === 'forward-trace'
              ? result.shapes.logits?.join(',') !== `2,${run.sequenceLength},256` ||
                Boolean(result.dataTrace)
              : !result.dataTrace ||
                result.shapes.inputs?.join(',') !== `2,${run.sequenceLength}` ||
                result.shapes.targets?.join(',') !== `2,${run.sequenceLength}`)
          )
            throw new Error('实验结果与请求不匹配');
        }
        if (message.kind === 'exit') {
          experimentExit = message.code;
          child.stdin.end();
        }
      } catch (failure) {
        error = `无效实验输出：${(failure as Error).message}`;
        child.stdin.end();
      }
    });
    child.stderr.on('data', (chunk: Buffer) => {
      if (eventCount++ < 100)
        this.store.event(
          id,
          'log',
          stripVTControlCharacters(chunk.toString('utf8')).slice(0, 4000),
        );
    });
    child.stdin.on('error', () => {});
    child.on('error', (failure) => {
      error = failure.message;
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      clearTimeout(watchdog);
      const reason = this.active?.id === id ? this.active.reason : 'interrupted';
      if (reason === 'cancelled') this.store.updateRun(id, 'cancelled');
      else if (reason === 'interrupted')
        this.store.updateRun(id, 'interrupted', '服务已关闭，实验被中断。');
      else if (reason === 'timeout')
        this.store.updateRun(id, 'failed', '实验超过 120 秒限制，已终止。');
      else if (code === 0 && experimentExit === 0 && result && !error)
        this.store.updateRun(id, 'succeeded', null, result);
      else
        this.store.updateRun(
          id,
          'failed',
          error || `实验进程退出 (${experimentExit ?? code})，请查看日志。`,
        );
      this.active = null;
      this.next();
    });
    child.stdin.write(
      `${JSON.stringify({ kind: 'run', preset: run.preset, sequenceLength: run.sequenceLength, experimentId: run.experimentId })}\n`,
    );
  }

  async close() {
    this.closing = true;
    for (const id of this.queue)
      this.store.updateRun(id, 'interrupted', '服务关闭时任务尚未开始。');
    this.queue = [];
    if (!this.active) return;
    const active = this.active;
    active.reason = 'interrupted';
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => active.child.kill(), 5000);
      active.child.once('close', () => {
        clearTimeout(timer);
        resolve();
      });
      active.child.stdin.end(`${JSON.stringify({ kind: 'cancel' })}\n`);
    });
  }
}

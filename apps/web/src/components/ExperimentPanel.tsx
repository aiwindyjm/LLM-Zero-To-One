import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Cpu, Play, Square, Terminal, RefreshCw } from 'lucide-react';
import {
  LESSON_ID,
  LESSON_VERSION,
  type EnvironmentStatus,
  type ExperimentRun,
  type RunEvent,
} from '@llm/contracts';
import { api } from '../lib/api';
import { Button } from './ui/button';

const statusLabels = {
  queued: '排队中',
  running: '运行中',
  succeeded: '已完成',
  failed: '失败',
  cancelled: '已停止',
  interrupted: '已中断',
};

export function ExperimentPanel() {
  const client = useQueryClient();
  const environment = useQuery({
    queryKey: ['environment'],
    queryFn: () => api<EnvironmentStatus>('/environment'),
  });
  const runs = useQuery({
    queryKey: ['runs'],
    queryFn: () => api<ExperimentRun[]>('/runs'),
    refetchInterval: 2500,
  });
  const [preset, setPreset] = useState<'cpu' | 'cuda'>('cpu');
  const [length, setLength] = useState(8);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const id = selectedId || runs.data?.[0]?.id;
  const detail = useQuery({
    queryKey: ['run', id],
    queryFn: () => api<{ run: ExperimentRun; events: RunEvent[] }>(`/runs/${id}`),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      ['running', 'queued'].includes(query.state.data?.run.status || '') ? 1000 : false,
  });
  const [liveEvents, setLiveEvents] = useState<RunEvent[]>([]);
  const run = detail.data?.run;
  useEffect(() => {
    setLiveEvents([]);
    if (!id) return;
    const source = new EventSource(`/api/runs/${id}/events`);
    source.onmessage = (event) => {
      const entry = JSON.parse(event.data) as RunEvent;
      setLiveEvents((current) =>
        current.some((existing) => existing.id === entry.id) ? current : [...current, entry],
      );
    };
    source.addEventListener('complete', () => {
      source.close();
      void client.invalidateQueries({ queryKey: ['run', id] });
      void client.invalidateQueries({ queryKey: ['runs'] });
    });
    source.onerror = () => source.close();
    return () => source.close();
  }, [id, client]);
  const start = useMutation({
    mutationFn: () =>
      api<ExperimentRun>('/runs', {
        lessonId: LESSON_ID,
        lessonVersion: LESSON_VERSION,
        experimentId: 'forward-trace',
        preset,
        sequenceLength: length,
      }),
    onSuccess: (created) => {
      setSelectedId(created.id);
      void client.invalidateQueries({ queryKey: ['runs'] });
    },
  });
  const cancel = useMutation({
    mutationFn: () => api(`/runs/${id}/cancel`, {}),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['run', id] });
    },
  });
  const events = Array.from(
    new Map(
      [...(detail.data?.events || []), ...liveEvents].map((event) => [event.id, event]),
    ).values(),
  ).sort((first, second) => first.id - second.id);
  return (
    <div className="experiment-panel">
      <p className="section-intro">直接运行固定版本的 nanochat.GPT。先预测形状，再观察真实结果。</p>
      <div className="environment-box">
        <Cpu size={19} />
        <div>
          <strong>
            {environment.isPending
              ? '正在检查本地环境…'
              : environment.data?.ready
                ? environment.data.gpuName || 'CPU 环境已就绪'
                : '需要准备实验环境'}
          </strong>
          <p>
            {environment.error?.message || environment.data?.message || '首次检查可能需要几秒。'}
          </p>
          {environment.data?.ready && (
            <small>
              Python {environment.data.python} · PyTorch {environment.data.torch}
            </small>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="重新检查环境"
          onClick={() => void environment.refetch()}
        >
          <RefreshCw />
        </Button>
      </div>
      {!environment.data?.ready && !environment.isPending && (
        <div className="callout">
          <strong>先在项目终端运行一次</strong>
          <code>pnpm experiment:setup</code>
          <p>Windows 使用 WSL Ubuntu。环境准备会下载 Python/PyTorch；点击实验运行不会自动安装。</p>
        </div>
      )}
      <div className="experiment-controls">
        <label>
          计算设备
          <select
            aria-label="计算设备"
            value={preset}
            onChange={(event) => setPreset(event.target.value as 'cpu' | 'cuda')}
          >
            <option value="cpu">CPU · float32</option>
            <option value="cuda" disabled={!environment.data?.gpuAvailable}>
              CUDA · bfloat16
            </option>
          </select>
        </label>
        <label>
          序列长度 T
          <select
            aria-label="序列长度"
            value={length}
            onChange={(event) => setLength(Number(event.target.value))}
          >
            <option value={8}>8 Tokens</option>
            <option value={16}>16 Tokens</option>
            <option value={32}>32 Tokens</option>
          </select>
        </label>
        <Button
          onClick={() => start.mutate()}
          disabled={start.isPending || !environment.data?.ready}
        >
          <Play size={16} />
          {start.isPending ? '提交中…' : '运行实验'}
        </Button>
      </div>
      <div className="experiment-config">
        <code>B=2</code>
        <code>C=128</code>
        <code>V=256</code>
        <code>Layers=2</code>
        <code>Seed=42</code>
      </div>
      {(start.error || cancel.error) && (
        <p role="alert" className="error-message">
          {start.error?.message || cancel.error?.message}
        </p>
      )}
      <p className="muted small">
        合成 Token ID · 随机初始化权重 · 本实验验证数据流，不代表语言能力。一次执行一个任务，最长
        120 秒。
      </p>
      {runs.error && <p className="error-message">{runs.error.message}</p>}
      {Boolean(runs.data?.length) && (
        <label className="history-select">
          实验历史
          <select
            aria-label="实验历史"
            value={id || ''}
            onChange={(event) => setSelectedId(event.target.value)}
          >
            {runs.data?.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {new Date(entry.createdAt).toLocaleTimeString()} · {entry.preset.toUpperCase()} · T=
                {entry.sequenceLength} · {statusLabels[entry.status]}
              </option>
            ))}
          </select>
        </label>
      )}
      {run && (
        <>
          <div className="run-heading">
            <span className={`status-pill status-${run.status}`}>
              {run.status === 'succeeded' && <CheckCircle2 size={14} />}
              {statusLabels[run.status]}
            </span>
            <code>{run.id.slice(0, 8)}</code>
            {['running', 'queued'].includes(run.status) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending}
              >
                <Square size={14} />
                停止实验
              </Button>
            )}
          </div>
          <div className="terminal" role="log" aria-label="实验日志">
            <div className="terminal-label">
              <Terminal size={14} />
              真实执行日志
            </div>
            {events.length ? (
              events.map((event) => (
                <div key={event.id}>
                  <span>{new Date(event.createdAt).toLocaleTimeString()}</span> {event.message}
                </div>
              ))
            ) : (
              <div>等待进程输出…</div>
            )}
          </div>
          {run.error && (
            <p role="alert" className="error-message">
              {run.error}
            </p>
          )}
          {run.result && (
            <section className="experiment-result">
              <h3>观察结果</h3>
              <div className="result-metrics">
                <div>
                  <span>设备</span>
                  <strong>{run.result.device}</strong>
                </div>
                <div>
                  <span>计算耗时</span>
                  <strong>{run.result.durationSeconds.toFixed(3)} s</strong>
                </div>
                <div>
                  <span>CUDA 峰值分配</span>
                  <strong>
                    {run.preset === 'cuda' ? `${run.result.peakMemoryMb} MB` : '不适用'}
                  </strong>
                </div>
              </div>
              <table>
                <thead>
                  <tr>
                    <th>站点</th>
                    <th>实测 Shape</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(run.result.shapes).map(([name, shape]) => (
                    <tr key={name}>
                      <td>
                        <code>{name}</code>
                      </td>
                      <td>
                        <code>({shape.join(', ')})</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p>
                预测 ID：<code>{run.result.nextTokenIds.join(', ')}</code> · 概率和：
                <code>
                  {run.result.probabilitiesSum.map((value) => value.toFixed(5)).join(', ')}
                </code>
              </p>
              <p className="muted small">
                结果已存入本机数据库。耗时包含模型初始化与前向计算，不含 Python
                启动；显存不等于整张显卡总占用。
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}

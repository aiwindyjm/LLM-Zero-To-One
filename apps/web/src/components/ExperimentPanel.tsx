import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Play, Square, RefreshCw } from 'lucide-react';
import { type EnvironmentStatus, type ExperimentRun, type RunEvent } from '@llm/contracts';
import { api } from '../lib/api';
import { useLesson, lessonQuery } from '../lib/lesson';
import { Button } from './ui/button';

const statusLabels = {
  queued: '排队中',
  running: '运行中',
  succeeded: '已完成',
  failed: '失败',
  cancelled: '已停止',
  interrupted: '已中断',
};
export function ExperimentPanel({
  selectedId,
  onSelect,
  length,
  onLength,
}: {
  selectedId: string | null;
  onSelect: (id: string) => void;
  length: number;
  onLength: (length: number) => void;
}) {
  const { lesson, experiment } = useLesson();
  const client = useQueryClient();
  const environment = useQuery({
    queryKey: ['environment'],
    queryFn: () => api<EnvironmentStatus>('/environment'),
  });
  const runs = useQuery({
    queryKey: ['runs', lesson.id, lesson.version],
    queryFn: () => api<ExperimentRun[]>(`/runs?${lessonQuery(lesson.id, lesson.version)}`),
    refetchInterval: 2500,
  });
  const [preset, setPreset] = useState<'cpu' | 'cuda'>('cpu');
  const detail = useQuery({
    queryKey: ['run', selectedId],
    queryFn: () => api<{ run: ExperimentRun; events: RunEvent[] }>(`/runs/${selectedId}`),
    enabled: Boolean(selectedId),
    refetchInterval: (query) =>
      ['running', 'queued'].includes(query.state.data?.run.status || '') ? 1000 : false,
  });
  const [liveEvents, setLiveEvents] = useState<RunEvent[]>([]);
  const run = detail.data?.run;
  useEffect(() => {
    setLiveEvents([]);
    if (!selectedId) return;
    const stream = new EventSource(`/api/runs/${selectedId}/events`);
    stream.onmessage = (event) => {
      const entry = JSON.parse(event.data) as RunEvent;
      setLiveEvents((current) =>
        current.some((item) => item.id === entry.id) ? current : [...current, entry],
      );
    };
    stream.addEventListener('complete', () => {
      stream.close();
      void client.invalidateQueries({ queryKey: ['run', selectedId] });
      void client.invalidateQueries({ queryKey: ['runs'] });
    });
    stream.onerror = () => stream.close();
    return () => stream.close();
  }, [selectedId, client]);
  const start = useMutation({
    mutationFn: () =>
      api<ExperimentRun>('/runs', {
        lessonId: lesson.id,
        lessonVersion: lesson.version,
        experimentId: experiment.id,
        preset,
        sequenceLength: length,
      }),
    onSuccess: (created) => {
      onSelect(created.id);
      void client.invalidateQueries({ queryKey: ['runs'] });
    },
  });
  const cancel = useMutation({
    mutationFn: () => api(`/runs/${selectedId}/cancel`, {}),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['run', selectedId] }),
  });
  const events = Array.from(
    new Map(
      [...(detail.data?.events || []), ...liveEvents].map((event) => [event.id, event]),
    ).values(),
  ).sort((first, second) => first.id - second.id);
  return (
    <div className="experiment-panel">
      <div className="experiment-controls">
        <label>
          设备
          <select
            aria-label="计算设备"
            value={preset}
            onChange={(event) => setPreset(event.target.value as 'cpu' | 'cuda')}
          >
            <option value="cpu">
              CPU · {experiment.id === 'data-trace' ? 'int64' : 'float32'}
            </option>
            <option
              value="cuda"
              disabled={!environment.data?.gpuAvailable || !experiment.presets.includes('cuda')}
            >
              CUDA · bfloat16
            </option>
          </select>
        </label>
        <label>
          探索长度 T
          <select
            aria-label="序列长度"
            value={length}
            onChange={(event) => onLength(Number(event.target.value))}
          >
            {[8, 16, 32].map((value) => (
              <option key={value} value={value}>
                {value} Tokens
              </option>
            ))}
          </select>
        </label>
        <Button
          onClick={() => start.mutate()}
          disabled={start.isPending || !environment.data?.ready}
        >
          <Play />
          {start.isPending ? '提交中…' : '运行实验'}
        </Button>
        {run && ['running', 'queued'].includes(run.status) && (
          <Button variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
            <Square />
            停止实验
          </Button>
        )}
      </div>
      <p className="run-summary" role="status">
        {run
          ? `${statusLabels[run.status]} · ${run.preset.toUpperCase()} · T=${run.sequenceLength} · ${run.id.slice(0, 8)}`
          : '先选长度，预测 Shape，再运行。自测证据使用 T=8。'}
      </p>
      {(start.error || cancel.error || detail.error || run?.error) && (
        <p role="alert" className="error-message">
          {start.error?.message || cancel.error?.message || detail.error?.message || run?.error}
        </p>
      )}
      {!environment.data?.ready && (
        <p role="alert" className="environment-message">
          {environment.isPending
            ? '正在检查实验环境…'
            : environment.error?.message ||
              environment.data?.message ||
              '环境不可用，请检查容器状态或运行 pnpm experiment:setup。'}
        </p>
      )}
      {run?.result && (
        <section className="experiment-result">
          <h3>观察结果</h3>
          <div className="shape-results">
            {Object.entries(run.result.shapes).map(([name, shape]) => (
              <div key={name}>
                <span>{name}</span>
                <code>({shape.join(', ')})</code>
              </div>
            ))}
          </div>
          <p className="muted small">
            {run.result.trace || run.result.dataTrace
              ? '结果已保存。上方图解选择“实测回放”，逐步查看这次运行的切片。'
              : '历史结果保留；本次记录没有向量切片。'}
          </p>
        </section>
      )}
      <details className="experiment-details">
        <summary>日志、历史与环境详情</summary>
        <label>
          实验历史
          <select
            aria-label="实验历史"
            value={selectedId || ''}
            onChange={(event) => onSelect(event.target.value)}
          >
            <option value="">选择一条记录</option>
            {runs.data?.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {new Date(entry.createdAt).toLocaleString()} · {entry.preset.toUpperCase()} · T=
                {entry.sequenceLength} · {statusLabels[entry.status]}
              </option>
            ))}
          </select>
        </label>
        {runs.error && <p role="alert">{runs.error.message}</p>}
        <div className="environment-summary">
          <span>
            {environment.data?.gpuName || 'CPU'} · Python {environment.data?.python || '—'} ·
            PyTorch {environment.data?.torch || '—'}
          </span>
          <Button
            size="icon"
            variant="ghost"
            aria-label="重新检查环境"
            onClick={() => void environment.refetch()}
          >
            <RefreshCw />
          </Button>
        </div>
        <div className="terminal" role="log" aria-label="实验日志">
          {events.length
            ? events.map((event) => (
                <div key={event.id}>
                  <time>{new Date(event.createdAt).toLocaleTimeString()}</time> {event.message}
                </div>
              ))
            : '等待运行。'}
        </div>
        {run?.result && (
          <p className="small">
            {experiment.id === 'data-trace' ? '分词、组批与目标切片' : '初始化、采样与前向计算'}{' '}
            {run.result.durationSeconds.toFixed(3)} s · CUDA 峰值张量分配{' '}
            {run.preset === 'cuda' ? `${run.result.peakMemoryMb} MiB` : '不适用'} · 不包含 Python
            导入和驱动显存。
          </p>
        )}
        <p className="small muted">
          同一时刻一个任务，最长 120 秒。停止会终止实验进程；刷新不影响运行。CUDA
          不可用时不会静默改用 CPU。
        </p>
      </details>
    </div>
  );
}

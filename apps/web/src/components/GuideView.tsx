import { useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import {
  type LearningStep,
  type ExperimentRun,
  type AssessmentAttempt,
  type CodeReference,
} from '@llm/contracts';
import { api } from '../lib/api';
import { useLesson, lessonQuery } from '../lib/lesson';
import { DataDiagram } from './DataDiagram';
import { Markdown } from './Markdown';
import { CodeLines, type SourcePayload } from './SourceView';
import { LearningDiagram } from './LearningDiagram';
import { Button } from './ui/button';
import { useSearchParams } from 'react-router';
import { LessonOrientation } from './LessonOrientation';

function Assessment({ step, onExperiment }: { step: LearningStep; onExperiment: () => void }) {
  const { lesson, experiment } = useLesson();
  const client = useQueryClient();
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const [runId, setRunId] = useState('');
  const runs = useQuery({
    queryKey: ['runs', lesson.id, lesson.version],
    queryFn: () => api<ExperimentRun[]>(`/runs?${lessonQuery(lesson.id, lesson.version)}`),
  });
  const evidence = runs.data?.filter(
    (run) =>
      run.status === 'succeeded' &&
      run.lessonId === lesson.id &&
      run.lessonVersion === lesson.version &&
      run.experimentId === experiment.id &&
      run.sequenceLength === 8,
  );
  const submit = useMutation({
    mutationFn: () =>
      api<{ attempt: AssessmentAttempt; feedback: string; note: string }>('/assessments', {
        lessonId: lesson.id,
        lessonVersion: lesson.version,
        stepId: step.id,
        answer,
        explanation,
        ...(runId ? { runId } : {}),
      }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['progress'] }),
  });
  return (
    <section className="assessment" aria-label="本步自测">
      <div className="section-heading">
        <h3>预测一下</h3>
        <span>
          {experiment.id === 'forward-trace'
            ? '自测固定 B=2、T=8、C=128、V=256'
            : '自测固定 B=2、T=8'}
        </span>
      </div>
      <p>{step.question}</p>
      <fieldset className="answer-choices">
        <legend className="sr-only">选择预测的形状</legend>
        {step.choices.map((choice) => (
          <label key={choice} className={answer === choice ? 'answer-selected' : ''}>
            <input
              type="radio"
              name={`answer-${step.id}`}
              value={choice}
              checked={answer === choice}
              onChange={() => setAnswer(choice)}
            />
            <code>{choice}</code>
          </label>
        ))}
      </fieldset>
      <details className="reflection">
        <summary>写下我的理解（可选）</summary>
        <label htmlFor="explanation">用自己的话解释这次变换</label>
        <textarea
          id="explanation"
          value={explanation}
          onChange={(event) => setExplanation(event.target.value)}
          rows={2}
          placeholder="哪根轴变了？为什么？"
        />
      </details>
      <label className="assessment-evidence">
        关联运行证据
        <select
          aria-label="选择验收实验"
          value={runId}
          onChange={(event) => setRunId(event.target.value)}
        >
          <option value="">先检查预测，不关联实验</option>
          {evidence?.map((run) => (
            <option key={run.id} value={run.id}>
              {new Date(run.createdAt).toLocaleString()} · {run.preset.toUpperCase()} · T=8 ·{' '}
              {run.id.slice(0, 8)}
            </option>
          ))}
        </select>
      </label>
      <div className="assessment-actions">
        <Button
          variant="outline"
          onClick={() => submit.mutate()}
          disabled={!answer || submit.isPending}
        >
          {submit.isPending ? '保存中…' : '检查预测'}
        </Button>
        <Button variant="ghost" onClick={onExperiment}>
          用实验验证
        </Button>
      </div>
      {submit.error && (
        <p role="alert" className="error-message">
          {submit.error.message}
        </p>
      )}
      {submit.data && (
        <div className="feedback" role="status">
          <strong>
            {submit.data.attempt.objectivePassed ? '客观题回答正确' : '再检查一下张量的轴'}
          </strong>
          <p>{submit.data.feedback}</p>
          <small>
            {submit.data.attempt.explanationStatus === 'not_provided'
              ? '未记录解释。'
              : '解释已保存，尚未评审。'}
            {runId ? '已关联所选实验。' : '还未关联实验验证。'}
          </small>
        </div>
      )}
    </section>
  );
}

export function GuideView({
  step,
  index,
  total,
  anchor,
  onAnchor,
  onSource,
  onNext,
  run,
  previewLength,
  onExperiment,
  experiment,
}: {
  step: LearningStep;
  index: number;
  total: number;
  anchor: LearningStep['diagram']['anchors'][number];
  onAnchor: (anchor: LearningStep['diagram']['anchors'][number]) => void;
  onSource: (reference: CodeReference) => void;
  onNext: () => void;
  run?: ExperimentRun;
  previewLength: number;
  onExperiment: () => void;
  experiment: ReactNode;
}) {
  const { experiment: definition } = useLesson();
  const [params, setParams] = useSearchParams();
  const stage = [0, 1, 2, 3].includes(Number(params.get('intro')))
    ? Number(params.get('intro'))
    : 0;
  const ready = !step.orientation || stage === 3;
  const reference = step.code.find((code) => code.id === anchor.codeId)!;
  const selected = { ...reference, startLine: anchor.startLine, endLine: anchor.endLine };
  const source = useQuery({
    queryKey: ['source', reference.file],
    queryFn: () => api<SourcePayload>(`/source?file=${encodeURIComponent(reference.file)}`),
    staleTime: Infinity,
  });
  const snippet = source.data?.content
    .split('\n')
    .slice(anchor.startLine - 1, anchor.endLine)
    .join('\n');
  return (
    <article className="guide-view">
      <header className="lesson-heading">
        <div>
          <span className="step-number">
            {String(index + 1).padStart(2, '0')} / {total}
          </span>
          <h1>{step.title.slice(5)}</h1>
        </div>
        <p>{step.diagram.prompt}</p>
        {step.motivation && <p className="step-motivation">{step.motivation}</p>}
      </header>
      {step.orientation && (
        <LessonOrientation
          content={step.orientation}
          stage={stage}
          onStage={(value) => {
            const next = new URLSearchParams(params);
            next.set('intro', String(value));
            setParams(next, { replace: true });
          }}
        />
      )}
      {ready && (
        <>
          {definition.id === 'data-trace' ? (
            <DataDiagram
              step={step}
              anchor={anchor}
              onAnchor={onAnchor}
              run={run}
              previewLength={previewLength}
            />
          ) : (
            <LearningDiagram
              key={`${step.id}-${run?.id || 'illustration'}`}
              step={step}
              anchor={anchor}
              onAnchor={onAnchor}
              run={run}
              previewLength={previewLength}
            />
          )}
          <section className="linked-source" aria-label="对应源码">
            <div className="code-card-heading">
              <span>
                <code>{reference.file}</code> · L{anchor.startLine}–{anchor.endLine}
              </span>
              <button onClick={() => onSource(selected)}>
                完整源码 <ArrowUpRight size={14} />
              </button>
            </div>
            {snippet ? (
              <CodeLines
                content={snippet}
                startLine={anchor.startLine}
                selection={selected}
                revealSelection={false}
                onSelect={(line) => {
                  const target = step.diagram.anchors.find(
                    (item) =>
                      item.codeId === reference.id &&
                      line >= item.startLine &&
                      line <= item.endLine,
                  );
                  if (target) onAnchor(target);
                }}
              />
            ) : (
              <p>{source.error?.message || '读取固定源码…'}</p>
            )}
          </section>
          <details className="full-explanation">
            <summary>展开原理与实现细节</summary>
            <Markdown>{step.explanation}</Markdown>
            {step.code.map((code) => (
              <button className="source-reference" key={code.id} onClick={() => onSource(code)}>
                {code.symbol} · L{code.startLine} <ArrowUpRight size={14} />
              </button>
            ))}
          </details>
          <Assessment key={step.id} step={step} onExperiment={onExperiment} />
        </>
      )}
      {experiment}
      {ready && (
        <div className="lesson-footer">
          <span>
            {definition.id === 'data-trace'
              ? '原创微型文本 · 教学词表 · 未训练语言模型'
              : '合成 ID · 随机权重，本课验证计算流程'}
          </span>
          <Button onClick={onNext}>
            {index === total - 1 ? '回顾这节课' : '下一步'}
            <ArrowRight size={16} />
          </Button>
        </div>
      )}
    </article>
  );
}

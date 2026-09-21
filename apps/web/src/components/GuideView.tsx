import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight, FlaskConical, CheckCircle2 } from 'lucide-react';
import {
  LESSON_ID,
  LESSON_VERSION,
  type LearningStep,
  type ExperimentRun,
  type AssessmentAttempt,
  type CodeReference,
} from '@llm/contracts';
import { api } from '../lib/api';
import { Markdown } from './Markdown';
import { CodeLines, type SourcePayload } from './SourceView';
import { Button } from './ui/button';

function Assessment({ step }: { step: LearningStep }) {
  const client = useQueryClient();
  const [answer, setAnswer] = useState('');
  const [explanation, setExplanation] = useState('');
  const runs = useQuery({ queryKey: ['runs'], queryFn: () => api<ExperimentRun[]>('/runs') });
  const successful = runs.data?.find(
    (run) => run.status === 'succeeded' && run.lessonVersion === LESSON_VERSION,
  );
  const submit = useMutation({
    mutationFn: () =>
      api<{ attempt: AssessmentAttempt; feedback: string; note: string }>('/assessments', {
        lessonId: LESSON_ID,
        lessonVersion: LESSON_VERSION,
        stepId: step.id,
        answer,
        explanation,
        ...(successful ? { runId: successful.id } : {}),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['progress'] });
    },
  });
  return (
    <section className="assessment">
      <div className="section-eyebrow">CHECK YOUR UNDERSTANDING</div>
      <h3>先预测，再验证</h3>
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
      <label className="explanation-label" htmlFor="explanation">
        用自己的话解释这次变换
        <textarea
          id="explanation"
          value={explanation}
          onChange={(event) => setExplanation(event.target.value)}
          placeholder="哪些轴保留了？哪一根轴发生变化？为什么？"
          rows={3}
        />
      </label>
      <div className="assessment-actions">
        <Button
          variant="outline"
          onClick={() => submit.mutate()}
          disabled={!answer || explanation.trim().length < 12 || submit.isPending}
        >
          {submit.isPending ? '保存中…' : '提交验收'}
        </Button>
        <span className="muted small">
          {successful ? '已关联本课成功实验' : '完成实验后，可验证客观项'}
        </span>
      </div>
      {submit.error && (
        <p role="alert" className="error-message">
          {submit.error.message}
        </p>
      )}
      {submit.data && (
        <div
          className={submit.data.attempt.objectivePassed ? 'feedback success-feedback' : 'feedback'}
          role="status"
        >
          <strong>
            {submit.data.attempt.objectivePassed ? '客观题回答正确' : '再检查一下张量的轴'}
          </strong>
          <p>{submit.data.feedback}</p>
          <small>{submit.data.note}</small>
        </div>
      )}
    </section>
  );
}

export function GuideView({
  step,
  index,
  total,
  onSource,
  onExperiment,
  onNext,
}: {
  step: LearningStep;
  index: number;
  total: number;
  onSource: (reference: CodeReference) => void;
  onExperiment: () => void;
  onNext: () => void;
}) {
  const reference = step.code[0];
  const source = useQuery({
    queryKey: ['source', reference.file],
    queryFn: () => api<SourcePayload>(`/source?file=${encodeURIComponent(reference.file)}`),
    staleTime: Infinity,
  });
  const snippet = source.data?.content
    .split('\n')
    .slice(reference.startLine - 1, reference.endLine)
    .join('\n');
  return (
    <article className="guide-view">
      <div className="lesson-kicker">
        <span>源码导学 / NANOCHAT</span>
        <span>
          步骤 {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
        </span>
      </div>
      <h1>{step.title.slice(5)}</h1>
      <p className="guide-subtitle">{step.subtitle}</p>
      <div className="objective">
        <CheckCircle2 size={18} />
        <div>
          <strong>这一小步，你会搞懂</strong>
          <p>{step.objective}</p>
        </div>
      </div>
      <div className="shape-flow">
        <div>
          <span>输入</span>
          <code>{step.input}</code>
        </div>
        <ArrowRight size={19} />
        <div>
          <span>输出</span>
          <code>{step.output}</code>
        </div>
      </div>
      <section className="code-card">
        <div className="code-card-heading">
          <span>
            <i className="python-dot" />
            {reference.file}
            <code>
              L{reference.startLine}–{reference.endLine}
            </code>
          </span>
          <button onClick={() => onSource(reference)}>
            完整源码 <ArrowUpRight size={15} />
          </button>
        </div>
        {snippet ? (
          <CodeLines content={snippet} startLine={reference.startLine} />
        ) : (
          <p className="loading-line">{source.error?.message || '正在读取真实源码…'}</p>
        )}
        <div className="code-card-footer">
          <span>Source · {reference.symbol}</span>
          <code>{reference.commit.slice(0, 8)}</code>
        </div>
      </section>
      <Markdown>{step.explanation}</Markdown>
      {step.code.length > 1 && (
        <div className="related-code">
          <span>继续追踪</span>
          {step.code.slice(1).map((code) => (
            <button key={code.id} onClick={() => onSource(code)}>
              {code.symbol}
              <code>L{code.startLine}</code>
              <ArrowUpRight size={14} />
            </button>
          ))}
        </div>
      )}
      <button className="experiment-callout" onClick={onExperiment}>
        <FlaskConical size={23} />
        <span>
          <strong>把预测交给真实代码验证</strong>
          <small>运行同一份 nanochat，查看每个站点的 Shape。</small>
        </span>
        <ArrowRight size={19} />
      </button>
      <Assessment key={step.id} step={step} />
      <div className="lesson-footer">
        <span className="muted">可以随时回到前面的步骤，不必依赖 AI 解锁。</span>
        <Button onClick={onNext}>
          {index === total - 1 ? '回顾第一步' : '下一步'}
          <ArrowRight size={16} />
        </Button>
      </div>
    </article>
  );
}

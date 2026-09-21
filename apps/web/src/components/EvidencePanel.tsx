import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, BookOpen, MessageCircle, Send, Square } from 'lucide-react';
import {
  LESSON_ID,
  LESSON_VERSION,
  type Catalog,
  type LearningStep,
  type TutorMessage,
} from '@llm/contracts';
import { api, tutorStream } from '../lib/api';
import { Markdown } from './Markdown';
import { Button } from './ui/button';

function Tutor({ step }: { step: LearningStep }) {
  const client = useQueryClient();
  const history = useQuery({
    queryKey: ['tutor', step.id],
    queryFn: () => api<TutorMessage[]>(`/tutor/messages?stepId=${step.id}`),
  });
  const [question, setQuestion] = useState('');
  const [mode, setMode] = useState<'explain' | 'hint'>('explain');
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  const send = async () => {
    setBusy(true);
    setDraft('');
    setError('');
    controller.current = new AbortController();
    try {
      await tutorStream(
        {
          lessonId: LESSON_ID,
          lessonVersion: LESSON_VERSION,
          stepId: step.id,
          message: question,
          mode,
        },
        (event) => {
          if (event.kind === 'delta') setDraft((current) => current + (event.text || ''));
          if (event.kind === 'done') {
            setDraft('');
            setQuestion('');
          }
          if (event.kind === 'error') setError(String(event.message));
        },
        controller.current.signal,
      );
    } catch (failure) {
      setError(
        (failure as Error).name === 'AbortError' ? '已停止回答。' : (failure as Error).message,
      );
    } finally {
      setBusy(false);
      void client.invalidateQueries({ queryKey: ['tutor', step.id] });
    }
  };
  return (
    <div className="tutor-panel">
      <div className="tutor-context">
        <MessageCircle size={18} />
        <div>
          <strong>只围绕你正在学的代码</strong>
          <p>
            {step.title} · {LESSON_VERSION}
          </p>
        </div>
      </div>
      <p className="muted small">AI 解释需要核对。当前教材、实验与客观验收不依赖模型服务。</p>
      <div className="tutor-messages">
        {history.data?.map((message) => (
          <div key={message.id} className={`tutor-message message-${message.role}`}>
            <small>{message.role === 'user' ? '你的问题' : 'AI 解释 · 请核对来源'}</small>
            <p>{message.text}</p>
          </div>
        ))}
        {draft && (
          <div className="tutor-message">
            <small>{busy ? '生成中 · 引用待检查' : '未完成的回答'}</small>
            <p>{draft}</p>
          </div>
        )}
      </div>
      <label className="tutor-mode">
        教学方式
        <select
          value={mode}
          onChange={(event) => setMode(event.target.value as 'explain' | 'hint')}
        >
          <option value="explain">解释当前代码</option>
          <option value="hint">给我提示，不给答案</option>
        </select>
      </label>
      <textarea
        aria-label="向 Tutor 提问"
        placeholder="例如：为什么这里保留了 B 和 T？"
        value={question}
        onChange={(event) => setQuestion(event.target.value)}
        rows={4}
        disabled={busy}
      />
      <div className="tutor-send">
        {busy ? (
          <Button variant="outline" onClick={() => controller.current?.abort()}>
            <Square size={14} />
            停止
          </Button>
        ) : (
          <Button onClick={() => void send()} disabled={!question.trim()}>
            <Send size={14} />
            发送问题
          </Button>
        )}
      </div>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <details className="tutor-setup">
        <summary>如何启用 Tutor</summary>
        <p>
          在项目根目录复制 .env.example 为 .env，填写
          TUTOR_BASE_URL、TUTOR_MODEL、TUTOR_API_KEY，然后重启本地服务。Key 只保存在服务端。
        </p>
      </details>
    </div>
  );
}

export function EvidencePanel({
  catalog,
  step,
  selectedKnowledge,
}: {
  catalog: Catalog;
  step: LearningStep;
  selectedKnowledge?: string;
}) {
  const [tab, setTab] = useState<'knowledge' | 'tutor'>('knowledge');
  useEffect(() => {
    setTab('knowledge');
  }, [selectedKnowledge]);
  const knowledge = catalog.knowledge.filter((item) => step.knowledgeIds.includes(item.id));
  return (
    <aside className="evidence-panel" aria-label="知识与资料">
      <div className="panel-tabs">
        <button className={tab === 'knowledge' ? 'active' : ''} onClick={() => setTab('knowledge')}>
          <BookOpen size={15} />
          知识与资料
        </button>
        <button className={tab === 'tutor' ? 'active' : ''} onClick={() => setTab('tutor')}>
          <MessageCircle size={15} />
          提问
        </button>
      </div>
      {tab === 'tutor' ? (
        <Tutor key={step.id} step={step} />
      ) : (
        <div className="evidence-content">
          {knowledge.map((item) => (
            <details
              className={`knowledge-entry ${selectedKnowledge === item.id ? 'knowledge-selected' : ''}`}
              key={item.id}
              open={selectedKnowledge === item.id}
            >
              <summary>{item.title}</summary>
              <Markdown>{item.body}</Markdown>
              <div className="misconception">
                <strong>容易混淆</strong>
                <p>{item.misconception}</p>
              </div>
            </details>
          ))}
          <details className="reference-library">
            <summary>来源与延伸阅读</summary>
            {catalog.sources
              .filter((source) => step.sourceIds.includes(source.id))
              .map((source) => (
                <a
                  className="source-link"
                  key={source.id}
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span className={`source-type type-${source.type}`}>
                    {source.type === 'source'
                      ? '源码'
                      : source.type === 'official'
                        ? '官方文档'
                        : '论文'}
                  </span>
                  <strong>
                    {source.title}
                    <ArrowUpRight size={14} />
                  </strong>
                  <p>{source.relevance}</p>
                  <small>{source.author}</small>
                </a>
              ))}
          </details>
        </div>
      )}
    </aside>
  );
}

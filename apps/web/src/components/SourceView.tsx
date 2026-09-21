import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ExternalLink, GitCommitHorizontal } from 'lucide-react';
import type { CodeReference, LearningStep } from '@llm/contracts';
import { api } from '../lib/api';
import { Button } from './ui/button';

export interface SourcePayload {
  file: string;
  content: string;
  commit: string;
  parent: string;
  message: string;
  diff: string | null;
  files: string[];
}

export function CodeLines({
  content,
  startLine = 1,
  selection,
  onSelect,
  revealSelection = true,
}: {
  content: string;
  startLine?: number;
  selection?: CodeReference;
  onSelect?: (line: number) => void;
  revealSelection?: boolean;
}) {
  const [highlighted, setHighlighted] = useState<{ content: string; lines: string[] }>({
    content: '',
    lines: [],
  });
  const container = useRef<HTMLDivElement>(null);
  const selectedStart = selection?.startLine;
  useEffect(() => {
    let current = true;
    import('../lib/highlight')
      .then(({ highlightPython }) => highlightPython(content))
      .then((html) => {
        const document = new DOMParser().parseFromString(html, 'text/html');
        if (current)
          setHighlighted({
            content,
            lines: Array.from(document.querySelectorAll('code > .line')).map(
              (line) => line.innerHTML,
            ),
          });
      })
      .catch(() => {
        if (current) setHighlighted({ content, lines: [] });
      });
    return () => {
      current = false;
    };
  }, [content]);
  useEffect(() => {
    if (revealSelection && selectedStart && container.current)
      container.current
        .querySelector(`[data-line="${selectedStart}"]`)
        ?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, [selectedStart, content, revealSelection]);
  const lines = content.replace(/\n$/, '').split('\n');
  return (
    <div className="code-lines" ref={container} role="region" aria-label="Python 源码">
      {lines.map((line, index) => {
        const number = startLine + index;
        const selected = selection && number >= selection.startLine && number <= selection.endLine;
        return (
          <div
            className={`code-line ${selected ? 'selected-line' : ''}`}
            data-line={number}
            key={number}
          >
            {onSelect ? (
              <button
                className="line-number"
                aria-label={`选择代码第 ${number} 行`}
                onClick={() => onSelect(number)}
              >
                {number}
              </button>
            ) : (
              <span className="line-number">{number}</span>
            )}
            {highlighted.content === content && highlighted.lines[index] ? (
              <code dangerouslySetInnerHTML={{ __html: highlighted.lines[index] }} />
            ) : (
              <code>{line || ' '}</code>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SourceView({
  reference,
  file,
  steps,
  onReference,
}: {
  reference: CodeReference;
  file: string;
  steps: LearningStep[];
  onReference: (reference: CodeReference, stepId: string) => void;
}) {
  const [mode, setMode] = useState<'code' | 'diff'>('code');
  const source = useQuery({
    queryKey: ['source', file],
    queryFn: () => api<SourcePayload>(`/source?file=${encodeURIComponent(file)}`),
    staleTime: Infinity,
  });
  if (source.isPending) return <div className="empty-state">正在读取固定版本源码…</div>;
  if (source.error) return <div className="error-message">{source.error.message}</div>;
  const selectLine = (line: number) => {
    for (const step of steps) {
      const code = step.code.find(
        (candidate) =>
          candidate.file === file && line >= candidate.startLine && line <= candidate.endLine,
      );
      if (code) {
        const anchor = step.diagram.anchors.find(
          (item) => item.codeId === code.id && line >= item.startLine && line <= item.endLine,
        );
        onReference(
          anchor ? { ...code, startLine: anchor.startLine, endLine: anchor.endLine } : code,
          step.id,
        );
        return;
      }
    }
  };
  return (
    <section className="source-view">
      <div className="source-toolbar">
        <div>
          <GitCommitHorizontal size={16} />
          <code>{source.data.commit.slice(0, 8)}</code>
          <span className="muted">固定版本</span>
        </div>
        <div>
          <Button
            variant={mode === 'code' ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => setMode('code')}
          >
            完整文件
          </Button>
          <Button
            variant={mode === 'diff' ? 'outline' : 'ghost'}
            size="sm"
            onClick={() => setMode('diff')}
          >
            Commit Diff
          </Button>
          <a
            aria-label="在 GitHub 查看源码"
            href={`https://github.com/karpathy/nanochat/blob/${source.data.commit}/${file}#L${reference.file === file ? reference.startLine : 1}`}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
      <div className="file-label">
        {file}
        <span>
          {mode === 'code'
            ? reference.file === file
              ? reference.symbol
              : '上游完整文件'
            : `${source.data.parent.slice(0, 8)} → ${source.data.commit.slice(0, 8)}`}
        </span>
      </div>
      {mode === 'code' ? (
        <CodeLines
          content={source.data.content}
          selection={reference.file === file ? reference : undefined}
          onSelect={selectLine}
        />
      ) : (
        <div className="diff-view">
          <p>{source.data.message}</p>
          {source.data.diff ? (
            source.data.diff.split('\n').map((line, index) => (
              <pre
                className={
                  line.startsWith('+') ? 'diff-add' : line.startsWith('-') ? 'diff-remove' : ''
                }
                key={index}
              >
                {line}
              </pre>
            ))
          ) : (
            <p className="muted">此 Commit 没有修改当前文件。这里不生成虚构的教学 Diff。</p>
          )}
        </div>
      )}
      <div className="source-note">
        点击本课覆盖的行号，定位对应学习步骤。完整 SHA：<code>{source.data.commit}</code>
      </div>
    </section>
  );
}

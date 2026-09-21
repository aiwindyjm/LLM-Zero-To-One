import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { ExperimentRun, LearningStep } from '@llm/contracts';
import { usePreferences } from '../lib/store';

type Anchor = LearningStep['diagram']['anchors'][number];
export function DataDiagram({
  step,
  anchor,
  onAnchor,
  run,
  previewLength,
}: {
  step: LearningStep;
  anchor: Anchor;
  onAnchor: (anchor: Anchor) => void;
  run?: ExperimentRun;
  previewLength: number;
}) {
  const [row, setRow] = useState(0);
  const [position, setPosition] = useState(0);
  const replay = usePreferences((state) => state.diagramReplay);
  const set = usePreferences((state) => state.set);
  const trace = replay && run?.status === 'succeeded' ? run.result?.dataTrace : undefined;
  const length = trace ? run!.sequenceLength : previewLength;
  const selected = Math.min(position, length - 1);
  const inputs =
    trace?.inputs ||
    [0, 1].map((batch) => Array.from({ length }, (_, i) => (i === 0 ? 256 : 10 + batch * 40 + i)));
  const targets =
    trace?.targets || inputs.map((items, batch) => [...items.slice(1), 10 + batch * 40 + length]);
  const doc = trace?.documents[row];
  const choose = (batch: number, index: number) => {
    setRow(batch);
    setPosition(index);
    onAnchor(step.diagram.anchors[step.id === 'targets' ? 1 : 0]);
  };
  return (
    <section className="learning-diagram data-diagram" aria-label={`${step.id} 交互图解`}>
      <div className="diagram-toolbar">
        <span className="evidence-label">
          {trace ? `实测结果回放 · CPU · T=${length}` : '教学示意 · 非运行结果'}
        </span>
        <div className="segmented-control" aria-label="图解数据来源">
          <button aria-pressed={!trace} onClick={() => set({ diagramReplay: false })}>
            示意
          </button>
          <button
            aria-pressed={Boolean(trace)}
            disabled={!run?.result?.dataTrace}
            onClick={() => set({ diagramReplay: true })}
          >
            实测回放
          </button>
        </div>
      </div>
      {step.id === 'tokenize' ? (
        <>
          <div className="segmented-control" aria-label="选择文档">
            {[0, 1].map((index) => (
              <button
                key={index}
                aria-pressed={row === index}
                onClick={() => {
                  setRow(index);
                  onAnchor(step.diagram.anchors[0]);
                }}
              >
                文档 {index + 1}
              </button>
            ))}
          </div>
          <p className="data-document">
            {doc?.text || (row === 0 ? 'Python reads text.' : 'Hello, 世界!')}
          </p>
          <div className="data-encoding">
            <span>文本</span>
            <ArrowRight size={18} />
            <button onClick={() => onAnchor(step.diagram.anchors[1])}>
              词表 {trace ? `V=${trace.vocabSize}` : '· BPE'}
            </button>
            <ArrowRight size={18} />
            <span>Token ID</span>
          </div>
          <div className="data-token-strip" aria-label="编码后的 Token ID">
            {(doc?.ids.slice(0, 24) || [11, 23, 7, 42]).map((id, index) => (
              <button
                key={index}
                aria-pressed={position === index}
                onClick={() => {
                  setPosition(index);
                  onAnchor(step.diagram.anchors[0]);
                }}
              >
                {doc ? id : `示例 ${id}`}
              </button>
            ))}
          </div>
          <p className="small muted">
            {doc
              ? `显示前 ${Math.min(doc.ids.length, 24)} / ${doc.ids.length} 项；整段解码与原文${doc.decoded === doc.text ? '一致' : '不一致'}。词表只在原创微型文本上学习。`
              : '示例编号不代表真实分词结果；运行后查看实际编码与解码验证。'}
          </p>
        </>
      ) : (
        <>
          <div className="axis-key">
            <span className="axis-b">B = 2 条序列</span>
            <span className="axis-t">T = {length} 个位置</span>
            <span>原始行 {length + 1} 项</span>
          </div>
          <div className="data-token-strip" aria-label="原始行">
            {[...inputs[row], targets[row][length - 1]].map((id, index) => (
              <span key={index} className={index === selected + 1 ? 'data-target-selected' : ''}>
                {index === 0 ? `BOS ${id}` : id}
              </span>
            ))}
          </div>
          <div className="data-batch-grid" aria-label="输入目标配对">
            {[0, 1].map((batch) => (
              <div key={batch}>
                <span>序列 {batch + 1} · inputs</span>
                <div className="data-token-strip">
                  {inputs[batch].map((id, index) => (
                    <button
                      key={index}
                      aria-label={`序列 ${batch + 1} 位置 ${index} 输入 ${id}`}
                      aria-pressed={row === batch && selected === index}
                      onClick={() => choose(batch, index)}
                    >
                      {index === 0 ? 'BOS' : id}
                    </button>
                  ))}
                </div>
                {step.id === 'targets' && (
                  <>
                    <span>targets</span>
                    <div className="data-token-strip">
                      {targets[batch].map((id, index) => (
                        <button
                          key={index}
                          aria-label={`序列 ${batch + 1} 位置 ${index} 目标 ${id}`}
                          aria-pressed={row === batch && selected === index}
                          onClick={() => choose(batch, index)}
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <p className="data-pair" role="status">
            位置 {selected}：输入 <code>{inputs[row][selected]}</code>
            <ArrowRight size={18} />
            目标 <code>{targets[row][selected]}</code>
          </p>
        </>
      )}
      <div className="diagram-anchors">
        {step.diagram.anchors.map((item) => (
          <button
            key={item.id}
            className={item.id === anchor.id ? 'active' : ''}
            aria-pressed={item.id === anchor.id}
            onClick={() => onAnchor(item)}
          >
            {item.label} <small>L{item.startLine}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

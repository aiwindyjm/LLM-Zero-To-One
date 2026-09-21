import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { ExperimentRun, LearningStep } from '@llm/contracts';

type Anchor = LearningStep['diagram']['anchors'][number];
function Vector({
  label,
  values,
  width = 128,
}: {
  label: string;
  values?: number[];
  width?: number;
}) {
  return (
    <div className="vector-view">
      <span>{label}</span>
      <div className="vector-cells" aria-label={label}>
        {Array.from({ length: 8 }, (_, index) => (
          <span
            key={index}
            className={values ? (values[index] >= 0 ? 'positive-value' : 'negative-value') : ''}
            title={`维度 ${index}`}
          >
            {values ? values[index].toFixed(2) : `${width === 256 ? 'v' : 'c'}${index}`}
          </span>
        ))}
        <span className="vector-rest">…</span>
      </div>
      <small>
        展示前 8 / {width} 维{values ? ' · 实测切片' : ' · 符号示意'}
      </small>
    </div>
  );
}

export function LearningDiagram({
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
  const [replay, setReplay] = useState(false);
  const [batch, setBatch] = useState(0);
  const [position, setPosition] = useState(0);
  const trace = replay && run?.status === 'succeeded' ? run.result?.trace : undefined;
  const length = trace ? run!.sequenceLength : previewLength;
  const selectedPosition = step.id === 'prediction' ? length - 1 : Math.min(position, length - 1);
  const tokenId = trace?.inputIds[batch][selectedPosition] ?? batch * length + selectedPosition;
  const sample = trace?.samples.find(
    (entry) => entry.batch === batch && entry.position === selectedPosition,
  );
  const select = (nextBatch: number, nextPosition: number) => {
    setBatch(nextBatch);
    setPosition(nextPosition);
    onAnchor(step.diagram.anchors[step.id === 'input' ? 1 : 0]);
  };
  const block = anchor.id === 'block-1' ? 1 : 0;
  const candidates = trace?.candidates[batch];
  return (
    <section className="learning-diagram" aria-label={`${step.diagram.kind} 交互图解`}>
      <div className="diagram-toolbar">
        <span className="evidence-label">
          {trace
            ? `实测结果回放 · ${run!.preset.toUpperCase()} · T=${length}`
            : '教学示意 · 非运行结果'}
        </span>
        <div className="segmented-control" aria-label="图解数据来源">
          <button aria-pressed={!trace} onClick={() => setReplay(false)}>
            示意
          </button>
          <button
            aria-pressed={Boolean(trace)}
            disabled={!run?.result?.trace}
            onClick={() => setReplay(true)}
          >
            实测回放
          </button>
        </div>
      </div>
      <div className="axis-key">
        <span className="axis-b">B = 2 条序列</span>
        <span className="axis-t">T = {length} 个位置</span>
        {!['input', 'prediction'].includes(step.id) && (
          <span className="axis-c">C = 128 维表示</span>
        )}
        {['logits', 'prediction'].includes(step.id) && (
          <span className="axis-v">V = 256 个候选</span>
        )}
      </div>
      <div className="token-matrix" aria-label="Token ID 网格">
        {[0, 1].map((row) => (
          <div className="token-row" key={row}>
            <button
              className="row-label"
              aria-label={`选择序列 ${row + 1}`}
              aria-pressed={batch === row}
              onClick={() => select(row, selectedPosition)}
            >
              序列 {row + 1}
            </button>
            <div className="token-cells">
              {Array.from({ length }, (_, column) => (
                <button
                  key={column}
                  className={`token-cell ${row === batch && column === selectedPosition ? 'token-selected' : ''} ${column === length - 1 && step.id === 'prediction' ? 'last-token' : ''}`}
                  aria-label={`序列 ${row + 1}，位置 ${column}，ID ${trace?.inputIds[row][column] ?? row * length + column}`}
                  aria-pressed={row === batch && column === selectedPosition}
                  onClick={() => select(row, column)}
                  disabled={step.id === 'prediction' && column !== length - 1}
                  onKeyDown={(event) => {
                    const offset =
                      event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
                    if (!offset) return;
                    event.preventDefault();
                    const target = Math.max(0, Math.min(length - 1, column + offset));
                    select(row, target);
                    const buttons =
                      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>(
                        'button',
                      );
                    buttons?.[target]?.focus();
                  }}
                >
                  <small>{column}</small>
                  {trace?.inputIds[row][column] ?? row * length + column}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      {step.id === 'input' && (
        <div className="input-explanation">
          <code>
            idx[{batch}][{selectedPosition}] = {tokenId}
          </code>
          <ArrowRight size={18} />
          <span>
            第 {batch + 1} 条序列，位置 {selectedPosition}
          </span>
          <p>像 Python 的两层列表：外层数序列，内层数位置。每格是一个整数 ID。</p>
        </div>
      )}
      {step.id === 'embedding' && (
        <div className="lookup-flow">
          <button
            className="lookup-index"
            onClick={() => onAnchor(step.diagram.anchors[1])}
            aria-label={`查看 ID ${tokenId} 对应的权重表`}
          >
            <small>权重表 · 256 行 × 128 列</small>
            <strong>第 {tokenId} 行</strong>
            <code>weight[{tokenId}]</code>
          </button>
          <ArrowRight className="diagram-arrow" size={22} />
          <button
            className="vector-action"
            onClick={() => onAnchor(step.diagram.anchors[0])}
            aria-label="定位向量查表代码"
          >
            <Vector label={`ID ${tokenId} → 一个 128 维向量`} values={sample?.vectors.embedding} />
          </button>
        </div>
      )}
      {step.id === 'block' && (
        <div className="block-explanation">
          <div className="block-route">
            <span>(B, T, C)</span>
            {[0, 1].map((index) => (
              <button
                key={index}
                aria-pressed={block === index}
                onClick={() => onAnchor(step.diagram.anchors[index])}
              >
                Block {index + 1}
                <small>形状保持 (2, {length}, 128)</small>
              </button>
            ))}
            <span>(B, T, C)</span>
          </div>
          <div className="vector-comparison">
            <Vector
              label={`Block ${block + 1} 的实际输入`}
              values={sample?.vectors[block === 0 ? 'block_0_input' : 'block_1_input']}
            />
            <ArrowRight size={18} />
            <Vector
              label={`Block ${block + 1} 的输出`}
              values={sample?.vectors[block === 0 ? 'block_0' : 'block_1']}
            />
          </div>
          <small>
            层间还包含上游残差混合；对照各层实际输入，不能把上一层输出直接当作下一层输入。
            本版本初始化时部分输出投影为零，Block 输入输出可能相同；这不代表训练后的 Block
            不改变表示。
          </small>
        </div>
      )}
      {step.id === 'logits' && (
        <button
          className="projection-flow"
          onClick={() => onAnchor(step.diagram.anchors[0])}
          aria-label="定位词表投影代码"
        >
          <Vector label="lm_head 接收的隐藏向量" values={sample?.vectors.hidden} />
          <div className="projection-operation">
            <code>lm_head</code>
            <ArrowRight size={22} />
            <small>C → V</small>
          </div>
          <Vector
            label="最终返回的 Logits（经过 softcap）"
            values={sample?.vectors.logits}
            width={256}
          />
        </button>
      )}
      {step.id === 'prediction' && (
        <div className="prediction-flow">
          <button className="last-position" onClick={() => onAnchor(step.diagram.anchors[0])}>
            <code>logits[:, -1, :]</code>
            <small>只取位置 {length - 1} · 预测序列之后的 ID</small>
          </button>
          <div className="probability-chart" aria-label="下一 Token 概率">
            {(
              candidates ||
              Array.from({ length: 5 }, (_, index) => ({
                tokenId: index,
                probability: 1 / 256,
                logit: 0,
              }))
            ).map((candidate) => (
              <button
                key={candidate.tokenId}
                onClick={() => onAnchor(step.diagram.anchors[1])}
                aria-label={`候选 ID ${candidate.tokenId}，概率 ${(candidate.probability * 100).toFixed(2)}%`}
              >
                <code>ID {candidate.tokenId}</code>
                <span className="probability-track">
                  <span
                    style={{
                      width: `${(candidate.probability / (candidates?.[0]?.probability || 1 / 256)) * 100}%`,
                    }}
                  />
                </span>
                <span>{(candidate.probability * 100).toFixed(2)}%</span>
              </button>
            ))}
          </div>
          <small>
            {candidates
              ? `实测前五名 · argmax 选出 ID ${run!.result!.nextTokenIds[batch]}。条长相对本次最大概率缩放，其余 251 项未显示。`
              : '等概率示意。运行后查看实际前五名；ID 尚未对应真实词语。'}
          </small>
        </div>
      )}
      {trace && !sample && (
        <p className="diagram-notice">
          此位置未采集向量。实测切片仅包含位置 0、1、{length - 1}；其余格仍可查看真实输入 ID。
        </p>
      )}
      {run?.result && !run.result.trace && (
        <p className="diagram-notice">
          这条旧记录只保存了形状，没有向量切片。可在实验区查看原结果，重新运行后启用回放。
        </p>
      )}
      <div className="diagram-anchors">
        {step.diagram.anchors.map((item) => (
          <button key={item.id} aria-pressed={anchor.id === item.id} onClick={() => onAnchor(item)}>
            {item.label}
            <small>L{item.startLine}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

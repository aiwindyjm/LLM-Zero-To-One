import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import type { LearningStep } from '@llm/contracts';
import { Button } from './ui/button';

export function LessonOrientation({
  content,
  stage,
  onStage,
}: {
  content: NonNullable<LearningStep['orientation']>;
  stage: number;
  onStage: (stage: number) => void;
}) {
  const [context, setContext] = useState(0);
  const [position, setPosition] = useState(1);
  const [answer, setAnswer] = useState('');
  const current = content.stages[stage];
  return (
    <section className="lesson-orientation" aria-label="从问题到模型输入">
      <nav className="orientation-stages" aria-label="理解路径">
        {content.stages.map((item, index) => (
          <button
            key={item.label}
            aria-current={stage === index ? 'step' : undefined}
            onClick={() => onStage(index)}
          >
            <span>{index + 1}</span>
            {item.label}
          </button>
        ))}
      </nav>
      <h2>{current.title}</h2>
      <p>{current.body}</p>
      {stage === 0 && (
        <>
          <div className="orientation-contexts" aria-label="两段不同的上文">
            {content.contexts.map((item, index) => (
              <button
                key={item.prefix}
                aria-pressed={context === index}
                onClick={() => setContext(index)}
              >
                {item.prefix}…
              </button>
            ))}
          </div>
          <div className="continuation-example" aria-live="polite">
            <span>{content.contexts[context].prefix}</span>
            <ArrowRight size={20} />
            <strong>{content.contexts[context].continuation}</strong>
          </div>
          <p className="small muted">一种合理的续写，不是唯一答案，也不是模型实测输出。</p>
          <div className="orientation-cycle">
            <span>已有上文</span>
            <ArrowRight size={16} />
            <span>预测下一个片段</span>
            <ArrowRight size={16} />
            <span>追加后，再预测</span>
          </div>
        </>
      )}
      {stage === 1 && (
        <>
          <div className="training-sentence" aria-label="原始文本的教学分块">
            {content.pieces.map((piece, index) => (
              <button
                key={piece.id}
                disabled={index === 0}
                aria-pressed={position === index}
                onClick={() => setPosition(index)}
              >
                {piece.text}
              </button>
            ))}
          </div>
          <div className="training-pair" aria-live="polite">
            <div>
              <small>给模型看的上文</small>
              <strong>
                {content.pieces
                  .slice(0, position)
                  .map((piece) => piece.text)
                  .join(' ')}
              </strong>
            </div>
            <ArrowRight size={20} />
            <div>
              <small>暂时遮住的答案</small>
              <strong>{content.pieces[position].text}</strong>
            </div>
          </div>
          <p className="small muted">按词分块的教学例子；真实 Token 不一定对应一个词。</p>
          <fieldset className="orientation-check">
            <legend>{content.check.question}</legend>
            {content.check.choices.map((choice) => (
              <label key={choice}>
                <input
                  type="radio"
                  name="orientation-check"
                  checked={answer === choice}
                  onChange={() => setAnswer(choice)}
                />
                {choice}
              </label>
            ))}
          </fieldset>
          {answer && (
            <p role="status">
              {answer === content.check.answer
                ? content.check.feedback
                : '再看上面的原始文本：预测可以错，原文中已有的下一片段才是这次练习的答案。'}
            </p>
          )}
        </>
      )}
      {stage === 2 && (
        <>
          <div className="teaching-vocabulary" aria-label="人为约定的教学词表">
            {content.pieces.map((piece, index) => (
              <button
                key={piece.id}
                aria-pressed={position === index}
                onClick={() => setPosition(index)}
              >
                <span>{piece.text}</span>
                <ArrowRight size={16} />
                <code>{piece.id}</code>
              </button>
            ))}
          </div>
          <pre className="orientation-python">
            <code>
              ids = [
              {content.pieces.map((piece, index) => (
                <span key={piece.id} className={position === index ? 'active' : ''}>
                  {index ? ', ' : ''}
                  {piece.id}
                </span>
              ))}
              ]
            </code>
          </pre>
          <p>换一张词表，同一段文本的编号也可能改变。模型必须使用与它匹配的词表。</p>
        </>
      )}
      {stage === 3 ? (
        <p className="orientation-boundary">
          下面改用 0 到 15 的合成编号、两条各 8
          个位置的序列，检查真实模型的计算流程。这些编号不对应上面的例句；模型尚未训练，不会因此学会续写。
        </p>
      ) : (
        <>
          <details className="orientation-notes">
            <summary>例子与源码的边界</summary>
            <p>{content.note}</p>
          </details>
          <div className="orientation-actions">
            <Button onClick={() => onStage(stage + 1)}>
              继续：{content.stages[stage + 1].label}
              <ArrowRight size={16} />
            </Button>
          </div>
        </>
      )}
    </section>
  );
}

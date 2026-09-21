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
  const [task, setTask] = useState(0);
  const [context, setContext] = useState(0);
  const [position, setPosition] = useState(1);
  const [answer, setAnswer] = useState('');
  const current = content.stages[stage];
  return (
    <section className="lesson-orientation" aria-label="从现实任务到模型输入">
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
          <div className="orientation-tasks" aria-label="选择一个语言任务">
            {content.tasks.map((item, index) => (
              <button key={item.title} aria-pressed={task === index} onClick={() => setTask(index)}>
                {item.title}
              </button>
            ))}
          </div>
          <div className="task-example" aria-live="polite">
            <div>
              <small>人提供的材料或要求</small>
              <strong>{content.tasks[task].input}</strong>
            </div>
            <ArrowRight size={20} />
            <div>
              <small>希望程序协助得到</small>
              <strong>{content.tasks[task].output}</strong>
            </div>
          </div>
          <p className="small muted">
            这是需求示意，不是模型实测输出。不同任务对正确性、隐私和延迟的要求也不同。
          </p>
        </>
      )}
      {stage === 1 && (
        <>
          <pre className="orientation-python">
            <code>if '截止时间' in text: extract_time(text)</code>
          </pre>
          <div className="rule-variants" aria-label="相近意思的不同表达">
            {content.variants.map((item) => (
              <div key={item.text}>
                <span>{item.text}</span>
                <strong className={item.keywordMatch ? 'rule-pass' : 'rule-miss'}>
                  {item.keywordMatch ? '规则命中' : '规则漏掉'}
                </strong>
              </div>
            ))}
          </div>
          <p className="small muted">
            这个例子只说明一条脆弱规则的覆盖范围。成熟的规则系统可以复杂得多；固定模板问题仍应优先选择确定性方法。
          </p>
        </>
      )}
      {stage === 2 && (
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
              <small>原文提供的下一片段</small>
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
                : '产品目标不只是在句尾续写。再看上面的训练对：已有文本本身就能反复提供上文和实际后续。'}
            </p>
          )}
          <div className="orientation-contexts" aria-label="预测可以反复生成片段">
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
          <p className="small muted">
            这只是教学续写，不是模型实测。是否具备问答等任务能力，需要单独评估。
          </p>
        </>
      )}
      {stage === 3 && (
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
      {stage === 4 ? (
        <p className="orientation-boundary">
          下面改用 0 到 15 的合成编号、两条各 8
          个位置的序列，检查真实模型的计算流程。这些编号不对应上面的例句；模型尚未训练，不会因此具备语言任务能力。
        </p>
      ) : (
        <>
          <details className="orientation-notes">
            <summary>示意、方法与真实能力的边界</summary>
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

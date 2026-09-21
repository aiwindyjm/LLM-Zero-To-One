import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BookOpen,
  Check,
  Code2,
  FileCode2,
  Github,
  Menu,
  Moon,
  Network,
  PanelRight,
  Sun,
} from 'lucide-react';
import {
  LESSON_ID,
  LESSON_VERSION,
  type AssessmentAttempt,
  type Catalog,
  type CodeReference,
  type ExperimentRun,
  type LearningGraph,
  type LearningStep,
  type StepProgress,
} from '@llm/contracts';
import product from '../../../package.json';
import { api } from './lib/api';
import { LessonContext, lessonQuery } from './lib/lesson';
import { usePreferences } from './lib/store';
import { GuideView } from './components/GuideView';
import { SourceView } from './components/SourceView';
import { EvidencePanel } from './components/EvidencePanel';
import { ExperimentPanel } from './components/ExperimentPanel';
import { Button } from './components/ui/button';
import { Dialog } from './components/ui/dialog';

const GraphView = lazy(() =>
  import('./components/GraphView').then((module) => ({ default: module.GraphView })),
);
type View = 'guide' | 'source' | 'graph' | 'review';

export default function App() {
  const preferences = usePreferences();
  const [params, setParams] = useSearchParams(
    window.location.search ? undefined : preferences.location,
  );
  const client = useQueryClient();
  const lessonId = params.get('lesson') || LESSON_ID;
  const lessonVersion = params.get('version') || LESSON_VERSION;
  const identityQuery = lessonQuery(lessonId, lessonVersion);
  const lessons = useQuery({
    queryKey: ['lessons'],
    queryFn: () => api<{ id: string; version: string; title: string }[]>('/lessons'),
  });
  const catalog = useQuery({
    queryKey: ['catalog', lessonId, lessonVersion],
    queryFn: () => api<Catalog>(`/catalog?${identityQuery}`),
    staleTime: Infinity,
  });
  const progress = useQuery({
    queryKey: ['progress', lessonId, lessonVersion],
    queryFn: () =>
      api<{ steps: StepProgress[]; attempts: AssessmentAttempt[] }>(`/progress?${identityQuery}`),
  });
  const runId = params.get('run');
  const run = useQuery({
    queryKey: ['run', runId],
    queryFn: () => api<{ run: ExperimentRun }>(`/runs/${runId}`),
    enabled: Boolean(runId),
    refetchInterval: (query) =>
      ['running', 'queued'].includes(query.state.data?.run.status || '') ? 1000 : false,
  });
  const [leftDrawer, setLeftDrawer] = useState(false);
  const [rightDrawer, setRightDrawer] = useState(false);
  const [navigation, setNavigation] = useState<'learning' | 'files'>('learning');
  const [experimentOpen, setExperimentOpen] = useState(false);
  const [selectedKnowledge, setSelectedKnowledge] = useState<string>();
  const experimentRef = useRef<HTMLDetailsElement>(null);
  const data = catalog.data;
  const step =
    data?.lesson.steps.find((entry) => entry.id === params.get('step')) || data?.lesson.steps[0];
  const view = (
    ['guide', 'source', 'graph', 'review'].includes(params.get('view') || '')
      ? params.get('view')
      : 'guide'
  ) as View;
  const selectedStepId = step?.id;
  const length = [8, 16, 32].includes(Number(params.get('length')))
    ? Number(params.get('length'))
    : 8;
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
  }, [preferences.theme]);
  const savePreferences = preferences.set;
  useEffect(() => {
    savePreferences({ location: params.toString() });
  }, [params, savePreferences]);
  useEffect(() => {
    if (!selectedStepId) return;
    void api('/progress', {
      lessonId,
      lessonVersion,
      stepId: selectedStepId,
    })
      .then(() => client.invalidateQueries({ queryKey: ['progress'] }))
      .catch(() => {});
  }, [selectedStepId, client, lessonId, lessonVersion]);
  useEffect(() => {
    if (experimentOpen && view === 'guide')
      experimentRef.current?.scrollIntoView({ block: 'nearest' });
  }, [experimentOpen, view]);
  if (catalog.isPending)
    return (
      <div className="boot-screen">
        <h1>正在读取课程…</h1>
      </div>
    );
  if (!data || !step)
    return (
      <div className="boot-screen">
        <h1>无法连接学习平台</h1>
        <p>{catalog.error?.message}</p>
        <p>请检查 Docker Desktop 中的平台容器，或运行 pnpm dev。</p>
        <Button onClick={() => void catalog.refetch()}>重新连接</Button>
      </div>
    );
  const index = data.lesson.steps.findIndex((entry) => entry.id === step.id);
  const selectedRun =
    run.data?.run.lessonId === lessonId &&
    run.data.run.lessonVersion === lessonVersion &&
    run.data.run.experimentId === data.experiment.id
      ? run.data.run
      : undefined;
  const selectLesson = (value: string) => {
    const target = lessons.data?.find((item) => `${item.id}@${item.version}` === value);
    if (!target) return;
    setParams({ lesson: target.id, version: target.version });
    setSelectedKnowledge(undefined);
    setExperimentOpen(false);
    setLeftDrawer(false);
    preferences.set({ diagramBatch: 0, diagramPosition: 0, diagramReplay: false });
  };
  const anchor =
    step.diagram.anchors.find((entry) => entry.id === params.get('anchor')) ||
    step.diagram.anchors[0];
  const originalReference =
    step.code.find((entry) => entry.id === params.get('code')) ||
    step.code.find((entry) => entry.id === anchor.codeId)!;
  const reference =
    params.has('anchor') && originalReference.id === anchor.codeId
      ? { ...originalReference, startLine: anchor.startLine, endLine: anchor.endLine }
      : originalReference;
  const file = params.get('file') || reference.file;
  const verified = progress.data?.steps.filter((entry) => entry.status === 'verified').length || 0;
  const updateParam = (name: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(name, value);
    else next.delete(name);
    setParams(next, { replace: true });
  };
  const navigate = (
    stepId: string,
    targetView: View = 'guide',
    code?: CodeReference,
    targetFile?: string,
    anchorId?: string,
  ) => {
    const next = new URLSearchParams(params);
    ['code', 'file', 'anchor'].forEach((name) => next.delete(name));
    next.set('step', stepId);
    next.set('view', targetView);
    if (code) next.set('code', code.id);
    if (targetFile) next.set('file', targetFile);
    if (anchorId) next.set('anchor', anchorId);
    if (
      code &&
      targetView === 'source' &&
      data.lesson.steps.find((entry) => entry.id === stepId)?.orientation
    )
      next.set('intro', '4');
    setParams(next);
    setLeftDrawer(false);
    setSelectedKnowledge(undefined);
  };
  const selectAnchor = (target: LearningStep['diagram']['anchors'][number]) => {
    navigate(
      step.id,
      'guide',
      step.code.find((entry) => entry.id === target.codeId),
      undefined,
      target.id,
    );
    setSelectedKnowledge(target.knowledgeId);
  };
  const sourceSelection = (code: CodeReference, stepId: string) => {
    const target = data.lesson.steps.find((entry) => entry.id === stepId)!;
    const linked = target.diagram.anchors.find(
      (entry) => entry.codeId === code.id && entry.startLine === code.startLine,
    );
    navigate(stepId, 'source', code, code.file, linked?.id);
    if (linked) setSelectedKnowledge(linked.knowledgeId);
  };
  const openExperiment = () => {
    navigate(step.id, 'guide', reference, undefined, anchor.id);
    setExperimentOpen(true);
    requestAnimationFrame(() => experimentRef.current?.scrollIntoView({ block: 'nearest' }));
  };
  const selectGraphNode = (node: LearningGraph['nodes'][number]) => {
    if (node.kind === 'experiment') {
      openExperiment();
      return;
    }
    if (node.knowledgeId) {
      if (!node.stepIds.includes(step.id)) navigate(node.stepIds[0], 'graph');
      setSelectedKnowledge(node.knowledgeId);
      if (window.innerWidth <= 1100) setRightDrawer(true);
      return;
    }
    if (node.kind === 'step') {
      navigate(node.stepIds[0]);
      return;
    }
    const target =
      data.lesson.steps.find((entry) => entry.code.some((code) => code.id === node.codeId)) || step;
    navigate(
      target.id,
      'source',
      target.code.find((code) => code.id === node.codeId) || target.code[0],
      node.file,
    );
  };
  const sidebar = (
    <div className="learning-sidebar">
      <div className="sidebar-heading">
        <strong>学习路径</strong>
        <small>nanochat · 真实源码</small>
        <select
          aria-label="选择课程"
          value={`${lessonId}@${lessonVersion}`}
          onChange={(event) => selectLesson(event.target.value)}
        >
          {lessons.data?.map((item) => (
            <option key={`${item.id}@${item.version}`} value={`${item.id}@${item.version}`}>
              {item.title}
            </option>
          ))}
        </select>
      </div>
      <div className="nav-mode">
        <button aria-pressed={navigation === 'learning'} onClick={() => setNavigation('learning')}>
          课程
        </button>
        <button aria-pressed={navigation === 'files'} onClick={() => setNavigation('files')}>
          源码目录
        </button>
      </div>
      {navigation === 'learning' ? (
        <nav aria-label="教学逻辑树">
          <div className="chapter-label">
            {data.curriculum.find((item) => item.lessonId === lessonId)?.title || data.lesson.title}
          </div>
          <div className="step-list">
            {data.lesson.steps.map((entry, order) => {
              const status = progress.data?.steps.find((item) => item.stepId === entry.id)?.status;
              return (
                <button
                  key={entry.id}
                  className={`step-link ${entry.id === step.id && view !== 'review' ? 'active' : ''}`}
                  aria-current={entry.id === step.id && view !== 'review' ? 'step' : undefined}
                  onClick={() => navigate(entry.id)}
                >
                  <span className={`step-dot ${status || ''}`}>
                    {status === 'verified' ? <Check size={12} /> : order + 1}
                  </span>
                  <span>
                    {entry.title.slice(5).split('：')[0]}
                    <small>{entry.title.slice(5).split('：')[1]}</small>
                  </span>
                </button>
              );
            })}
          </div>
          <button
            className={`review-link ${view === 'review' ? 'active' : ''}`}
            onClick={() => navigate(step.id, 'review')}
          >
            课程回顾
          </button>
          <details className="future-route">
            <summary>后续路线 · 计划中</summary>
            {data.curriculum
              .filter((chapter) => chapter.status === 'planned')
              .map((chapter) => (
                <details key={chapter.id}>
                  <summary>{chapter.title}</summary>
                  <p>{chapter.objective}</p>
                  <small>{chapter.files.join(' · ')}</small>
                </details>
              ))}
          </details>
        </nav>
      ) : (
        <nav className="file-tree" aria-label="源码目录">
          <strong>nanochat /</strong>
          {[
            'gpt.py',
            'common.py',
            'flash_attention.py',
            'optim.py',
            'tokenizer.py',
            'dataset.py',
            'dataloader.py',
          ].map((name) => (
            <button
              key={name}
              onClick={() => navigate(step.id, 'source', reference, `nanochat/${name}`)}
            >
              <FileCode2 size={15} />
              {name}
            </button>
          ))}
        </nav>
      )}
      <div className="sidebar-bottom">
        <span>客观项验证</span>
        <strong>
          {verified} / {data.lesson.steps.length}
        </strong>
        <div className="progress-track">
          <span style={{ width: `${(verified * 100) / data.lesson.steps.length}%` }} />
        </div>
      </div>
    </div>
  );
  const evidence = (
    <EvidencePanel
      key={`${lessonId}-${lessonVersion}-${step.id}`}
      catalog={data}
      step={step}
      selectedKnowledge={
        step.orientation && Number(params.get('intro') || 0) < 4
          ? step.orientation.knowledgeId
          : selectedKnowledge || anchor.knowledgeId
      }
    />
  );
  const resize = (side: 'left' | 'right', delta: number) =>
    preferences.set(
      side === 'left'
        ? { leftWidth: Math.max(200, Math.min(320, preferences.leftWidth + delta)) }
        : { rightWidth: Math.max(260, Math.min(420, preferences.rightWidth + delta)) },
    );
  const separator = (side: 'left' | 'right') => (
    <div
      className="panel-resizer"
      role="separator"
      aria-label={`调整${side === 'left' ? '左' : '右'}侧栏宽度`}
      aria-orientation="vertical"
      aria-valuenow={side === 'left' ? preferences.leftWidth : preferences.rightWidth}
      tabIndex={0}
      onKeyDown={(event) => {
        if (['ArrowLeft', 'ArrowRight'].includes(event.key)) {
          event.preventDefault();
          resize(side, (event.key === 'ArrowRight' ? 16 : -16) * (side === 'left' ? 1 : -1));
        }
      }}
      onPointerDown={(event) => event.currentTarget.setPointerCapture(event.pointerId)}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId) && event.buttons === 1)
          resize(side, event.movementX * (side === 'left' ? 1 : -1));
      }}
      onPointerUp={(event) => event.currentTarget.releasePointerCapture(event.pointerId)}
    />
  );
  const experiment = (
    <details
      className="inline-experiment"
      ref={experimentRef}
      open={experimentOpen}
      onToggle={(event) => setExperimentOpen(event.currentTarget.open)}
    >
      <summary>运行与观察 {selectedRun?.status === 'succeeded' ? '· 已有结果' : ''}</summary>
      {experimentOpen && (
        <ExperimentPanel
          key={`${lessonId}-${lessonVersion}`}
          selectedId={selectedRun ? runId : null}
          onSelect={(id) => updateParam('run', id)}
          length={length}
          onLength={(value) => updateParam('length', String(value))}
        />
      )}
    </details>
  );
  return (
    <LessonContext.Provider value={data}>
      <div className="app-shell">
        <a className="skip-link" href="#learning-main">
          跳到学习内容
        </a>
        <header className="topbar">
          <div className="brand">
            <strong>LLM Zero to One</strong>
            <span>交互教材</span>
          </div>
          <div className="topbar-actions">
            <Button
              variant="ghost"
              size="icon"
              aria-label="切换学习导航"
              onClick={() =>
                window.innerWidth <= 1100
                  ? setLeftDrawer(true)
                  : preferences.set({ leftHidden: !preferences.leftHidden })
              }
            >
              <Menu />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="切换知识侧栏"
              onClick={() =>
                window.innerWidth <= 1100
                  ? setRightDrawer(true)
                  : preferences.set({ rightHidden: !preferences.rightHidden })
              }
            >
              <PanelRight />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={preferences.theme === 'light' ? '切换深色主题' : '切换浅色主题'}
              onClick={() =>
                preferences.set({ theme: preferences.theme === 'light' ? 'dark' : 'light' })
              }
            >
              {preferences.theme === 'light' ? <Moon /> : <Sun />}
            </Button>
            <a
              className="icon-button"
              href="https://github.com/aiwindyjm/LLM-Zero-To-One"
              target="_blank"
              rel="noreferrer"
              aria-label={`项目 GitHub · v${product.version}`}
            >
              <Github size={18} />
            </a>
          </div>
        </header>
        <div
          className={`workspace ${preferences.leftHidden ? 'left-hidden' : ''} ${preferences.rightHidden ? 'right-hidden' : ''}`}
          style={
            {
              '--left-width': `${preferences.leftWidth}px`,
              '--right-width': `${preferences.rightWidth}px`,
            } as CSSProperties
          }
        >
          <div className="left-panel">{sidebar}</div>
          {separator('left')}
          <main id="learning-main" className="center-panel">
            <div className="workspace-toolbar">
              <div className="view-tabs" role="tablist" aria-label="学习视图">
                {(
                  [
                    { id: 'guide', label: '交互教材', icon: BookOpen },
                    { id: 'source', label: '真实源码', icon: Code2 },
                    { id: 'graph', label: '关系网络', icon: Network },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={view === tab.id}
                    className={view === tab.id ? 'active' : ''}
                    onClick={() =>
                      navigate(
                        step.id,
                        tab.id,
                        reference,
                        view === 'source' ? file : undefined,
                        anchor.id,
                      )
                    }
                  >
                    <tab.icon size={15} />
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" onClick={openExperiment}>
                打开实验
              </Button>
            </div>
            <div
              className={`learning-content content-${view}`}
              key={`${lessonId}-${lessonVersion}-${view}-${step.id}`}
            >
              {view === 'guide' ? (
                <GuideView
                  step={step}
                  index={index}
                  total={data.lesson.steps.length}
                  anchor={anchor}
                  onAnchor={selectAnchor}
                  onSource={(code) => sourceSelection(code, step.id)}
                  onNext={() =>
                    navigate(
                      data.lesson.steps[Math.min(index + 1, data.lesson.steps.length - 1)].id,
                      index === data.lesson.steps.length - 1 ? 'review' : 'guide',
                    )
                  }
                  run={selectedRun}
                  previewLength={length}
                  onExperiment={openExperiment}
                  experiment={experiment}
                />
              ) : view === 'source' ? (
                <SourceView
                  reference={reference}
                  file={file}
                  steps={data.lesson.steps}
                  onReference={sourceSelection}
                />
              ) : view === 'graph' ? (
                <Suspense fallback={<p>整理关系网络…</p>}>
                  <GraphView graph={data.graph} stepId={step.id} onSelect={selectGraphNode} />
                </Suspense>
              ) : (
                <section className="course-review">
                  <h1>{lessonId === LESSON_ID ? '把五步串起来' : '从文本到训练目标'}</h1>
                  <p>{data.lesson.summary}</p>
                  <ol>
                    {data.lesson.steps.map((entry) => (
                      <li key={entry.id}>
                        <button onClick={() => navigate(entry.id)}>{entry.title.slice(5)}</button>
                        <span>
                          {progress.data?.steps.find((item) => item.stepId === entry.id)?.status ===
                          'verified'
                            ? '客观项已验证'
                            : '可以继续练习'}
                        </span>
                      </li>
                    ))}
                  </ol>
                  <h2>再想一想</h2>
                  <p>
                    {lessonId === LESSON_ID
                      ? '为什么随机初始化的模型也能给出合法 ID，却不代表它已经学会语言？'
                      : '为什么输入与目标形状相同，却不能把目标直接复制为输入？文档边界在哪里？'}
                  </p>
                  <details>
                    <summary>我的验收记录</summary>
                    {progress.data?.attempts.length ? (
                      progress.data.attempts.map((attempt) => (
                        <div className="attempt-record" key={attempt.id}>
                          <strong>
                            {data.lesson.steps.find((entry) => entry.id === attempt.stepId)?.title}
                          </strong>
                          <p>
                            {attempt.answer} · {attempt.objectivePassed ? '客观题正确' : '待复习'}
                          </p>
                          <p>{attempt.explanation || '未记录解释'}</p>
                          <small>
                            {new Date(attempt.createdAt).toLocaleString()} ·{' '}
                            {attempt.runId ? '已关联实验' : '未关联实验'}
                          </small>
                        </div>
                      ))
                    ) : (
                      <p>选择一步，先完成一个形状预测。</p>
                    )}
                  </details>
                  <p className="muted">
                    后续路线仍在建设中；本课验证计算流程，不宣称模型已有语言能力。
                  </p>
                </section>
              )}
            </div>
          </main>
          {separator('right')}
          <div className="right-panel">{evidence}</div>
        </div>
        <Dialog open={leftDrawer} onOpenChange={setLeftDrawer} title="学习路线" side="left">
          {sidebar}
        </Dialog>
        <Dialog open={rightDrawer} onOpenChange={setRightDrawer} title="知识与资料" side="right">
          {evidence}
        </Dialog>
      </div>
    </LessonContext.Provider>
  );
}

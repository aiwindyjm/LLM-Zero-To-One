import { lazy, Suspense, useEffect, useState, type CSSProperties } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  Code2,
  FileCode2,
  FlaskConical,
  Github,
  GitCommitHorizontal,
  Menu,
  Moon,
  Network,
  PanelRight,
  Sun,
} from 'lucide-react';
import {
  LESSON_ID,
  LESSON_VERSION,
  type Catalog,
  type CodeReference,
  type LearningGraph,
  type StepProgress,
  type AssessmentAttempt,
} from '@llm/contracts';
import { api } from './lib/api';
import { usePreferences } from './lib/store';
import { Button } from './components/ui/button';
import { Dialog } from './components/ui/dialog';
import { GuideView } from './components/GuideView';
import { SourceView } from './components/SourceView';
import { EvidencePanel } from './components/EvidencePanel';
import { ExperimentPanel } from './components/ExperimentPanel';
import product from '../../../package.json';

const GraphView = lazy(() =>
  import('./components/GraphView').then((module) => ({ default: module.GraphView })),
);
type View = 'guide' | 'source' | 'graph';

export default function App() {
  const catalog = useQuery({
    queryKey: ['catalog'],
    queryFn: () => api<Catalog>('/catalog'),
    staleTime: Infinity,
  });
  const [params, setParams] = useSearchParams();
  const preferences = usePreferences();
  const client = useQueryClient();
  const [experimentOpen, setExperimentOpen] = useState(false);
  const [leftDrawer, setLeftDrawer] = useState(false);
  const [rightDrawer, setRightDrawer] = useState(false);
  const [navigation, setNavigation] = useState<'learning' | 'files'>('learning');
  const [planned, setPlanned] = useState<Catalog['curriculum'][number] | null>(null);
  const [selectedKnowledge, setSelectedKnowledge] = useState<string>();
  const progress = useQuery({
    queryKey: ['progress'],
    queryFn: () => api<{ steps: StepProgress[]; attempts: AssessmentAttempt[] }>('/progress'),
  });
  const data = catalog.data;
  const step =
    data?.lesson.steps.find((entry) => entry.id === params.get('step')) || data?.lesson.steps[0];
  const selectedStepId = step?.id;
  const view = (
    ['guide', 'source', 'graph'].includes(params.get('view') || '') ? params.get('view') : 'guide'
  ) as View;
  useEffect(() => {
    document.documentElement.dataset.theme = preferences.theme;
  }, [preferences.theme]);
  useEffect(() => {
    if (!selectedStepId) return;
    void api('/progress', {
      lessonId: LESSON_ID,
      lessonVersion: LESSON_VERSION,
      stepId: selectedStepId,
    })
      .then(() => client.invalidateQueries({ queryKey: ['progress'] }))
      .catch(() => {});
  }, [selectedStepId, client]);
  if (catalog.isPending)
    return (
      <div className="boot-screen">
        <div className="brand-symbol">0→1</div>
        <h1>正在打开源码学习工作区</h1>
        <p>读取课程、知识关联与固定源码…</p>
      </div>
    );
  if (!data || !step)
    return (
      <div className="boot-screen">
        <h1>暂时无法连接本地服务</h1>
        <p>{catalog.error?.message}</p>
        <Button onClick={() => void catalog.refetch()}>重新连接</Button>
        <code>pnpm dev</code>
      </div>
    );
  const index = data.lesson.steps.findIndex((entry) => entry.id === step.id);
  const reference = step.code.find((entry) => entry.id === params.get('code')) || step.code[0];
  const file = params.get('file') || reference.file;
  const verified = progress.data?.steps.filter((entry) => entry.status === 'verified').length || 0;
  const navigate = (
    stepId: string,
    targetView = view,
    code?: CodeReference,
    targetFile?: string,
  ) => {
    const next = new URLSearchParams({ step: stepId, view: targetView });
    if (code) next.set('code', code.id);
    if (targetFile) next.set('file', targetFile);
    setParams(next);
    setLeftDrawer(false);
    setSelectedKnowledge(undefined);
  };
  const selectGraphNode = (node: LearningGraph['nodes'][number]) => {
    if (node.kind === 'experiment') {
      setExperimentOpen(true);
      return;
    }
    if (node.knowledgeId) {
      setSelectedKnowledge(node.knowledgeId);
      if (window.innerWidth <= 1100) setRightDrawer(true);
      return;
    }
    if (node.kind === 'step') {
      navigate(node.stepIds[0], 'guide');
      return;
    }
    const targetStep =
      data.lesson.steps.find((entry) => entry.code.some((code) => code.id === node.codeId)) || step;
    const targetCode =
      targetStep.code.find((code) => code.id === node.codeId) || targetStep.code[0];
    navigate(targetStep.id, 'source', targetCode, node.file);
  };
  const sidebar = (
    <div className="learning-sidebar">
      <div className="sidebar-heading">
        <span className="section-eyebrow">YOUR LEARNING PATH</span>
        <h2>从代码到理解</h2>
        <p>同一个项目，一步步走到完整模型。</p>
      </div>
      <div className="nav-mode">
        <button
          className={navigation === 'learning' ? 'active' : ''}
          onClick={() => setNavigation('learning')}
        >
          <BookOpen size={14} />
          教学逻辑
        </button>
        <button
          className={navigation === 'files' ? 'active' : ''}
          onClick={() => setNavigation('files')}
        >
          <FileCode2 size={14} />
          源码目录
        </button>
      </div>
      {navigation === 'learning' ? (
        <nav aria-label="教学逻辑树">
          <div className="path-project">
            <span className="project-mark">N</span>
            <div>
              <strong>nanochat</strong>
              <small>源码驱动 · 从 0 到 1</small>
            </div>
            <ChevronDown size={14} />
          </div>
          <div className="chapter-active">
            <div className="chapter-label">
              <ChevronDown size={14} />
              <strong>01 · 一次完整预测</strong>
              <span>5 步</span>
            </div>
            <div className="step-list">
              {data.lesson.steps.map((entry) => {
                const status = progress.data?.steps.find(
                  (item) => item.stepId === entry.id,
                )?.status;
                return (
                  <button
                    key={entry.id}
                    className={`step-link ${entry.id === step.id ? 'active' : ''}`}
                    aria-current={entry.id === step.id ? 'step' : undefined}
                    onClick={() => navigate(entry.id, view)}
                  >
                    <span className={`step-dot ${status || ''}`}>
                      {status === 'verified' ? (
                        <Check size={10} />
                      ) : entry.id === step.id ? (
                        <span />
                      ) : null}
                    </span>
                    <span>
                      {entry.title.slice(5)}
                      <small>{entry.subtitle}</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          {data.curriculum.slice(1).map((chapter) => (
            <button
              className="planned-chapter"
              key={chapter.id}
              onClick={() => setPlanned(chapter)}
            >
              <ChevronRight size={14} />
              <span>{chapter.title}</span>
              <small>计划中</small>
            </button>
          ))}
        </nav>
      ) : (
        <nav className="file-tree" aria-label="源码目录">
          <strong>nanochat /</strong>
          {['gpt.py', 'common.py', 'flash_attention.py', 'optim.py'].map((name) => (
            <button
              key={name}
              className={file === `nanochat/${name}` && view === 'source' ? 'active' : ''}
              onClick={() => navigate(step.id, 'source', reference, `nanochat/${name}`)}
            >
              <FileCode2 size={15} />
              {name}
            </button>
          ))}
          <p className="muted small">本课涉及的真实源码快照。完整仓库可在 GitHub 查看。</p>
        </nav>
      )}
      <div className="sidebar-bottom">
        <div>
          <span>样板课 · 客观项验证</span>
          <strong>{verified} / 5</strong>
        </div>
        <div className="progress-track">
          <span style={{ width: `${verified * 20}%` }} />
        </div>
        <small>解释与迁移能力仍需独立复盘。</small>
        <a href="https://github.com/karpathy/nanochat" target="_blank" rel="noreferrer">
          <Github size={14} />
          上游 nanochat
          <ArrowUpRight size={13} />
        </a>
      </div>
    </div>
  );
  const evidence = (
    <EvidencePanel catalog={data} step={step} selectedKnowledge={selectedKnowledge} />
  );
  const resize = (side: 'left' | 'right', delta: number) =>
    preferences.set(
      side === 'left'
        ? { leftWidth: Math.max(220, Math.min(380, preferences.leftWidth + delta)) }
        : { rightWidth: Math.max(290, Math.min(470, preferences.rightWidth + delta)) },
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
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
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
  return (
    <div className="app-shell">
      <a className="skip-link" href="#learning-main">
        跳到学习内容
      </a>
      <header className="topbar">
        <div className="brand">
          <span className="brand-symbol">0→1</span>
          <div>
            <strong>
              LLM <span>Zero to One</span>
            </strong>
            <small>从真实源码开始</small>
          </div>
          <span className="version-tag">v{product.version}</span>
        </div>
        <div className="topbar-center">
          <span className="live-dot" />
          本地学习工作区
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
            className="icon-button github-link"
            href="https://github.com/aiwindyjm/LLM-Zero-To-One"
            aria-label="项目 GitHub"
            target="_blank"
            rel="noreferrer"
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
          <div className="workspace-breadcrumb">
            <span>nanochat</span>
            <ChevronRight size={12} />
            <span>一次完整预测</span>
            <div>
              <GitCommitHorizontal size={14} />
              <code>{data.lesson.commit.slice(0, 8)}</code>
            </div>
          </div>
          <div className="workspace-toolbar">
            <div className="view-tabs" role="tablist" aria-label="学习视图">
              {(
                [
                  { id: 'guide', label: '导学讲解', icon: BookOpen },
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
                    navigate(step.id, tab.id, reference, view === 'source' ? file : undefined)
                  }
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setExperimentOpen(true)}>
              <FlaskConical size={15} />
              <span>运行实验</span>
            </Button>
          </div>
          <div className={`learning-content content-${view}`} key={`${view}-${step.id}`}>
            {view === 'guide' ? (
              <GuideView
                step={step}
                index={index}
                total={data.lesson.steps.length}
                onSource={(code) => navigate(step.id, 'source', code)}
                onExperiment={() => setExperimentOpen(true)}
                onNext={() =>
                  navigate(data.lesson.steps[(index + 1) % data.lesson.steps.length].id, 'guide')
                }
              />
            ) : view === 'source' ? (
              <SourceView
                reference={reference}
                file={file}
                steps={data.lesson.steps}
                onReference={(code, stepId) => navigate(stepId, 'source', code)}
              />
            ) : (
              <Suspense fallback={<div className="empty-state">正在整理知识网络…</div>}>
                <GraphView graph={data.graph} stepId={step.id} onSelect={selectGraphNode} />
              </Suspense>
            )}
          </div>
          <footer className="workspace-status">
            <span>
              <Circle size={8} fill="currentColor" />
              固定源码 · 可追溯
            </span>
            <span>Python · {data.lesson.steps.length} 个学习步骤</span>
          </footer>
        </main>
        {separator('right')}
        <div className="right-panel">{evidence}</div>
      </div>
      <Dialog
        open={experimentOpen}
        onOpenChange={setExperimentOpen}
        title="实验室 · 追踪一次真实前向计算"
      >
        <ExperimentPanel />
      </Dialog>
      <Dialog open={leftDrawer} onOpenChange={setLeftDrawer} title="学习路线" side="left">
        {sidebar}
      </Dialog>
      <Dialog open={rightDrawer} onOpenChange={setRightDrawer} title="知识与资料" side="right">
        {evidence}
      </Dialog>
      <Dialog
        open={Boolean(planned)}
        onOpenChange={(open) => {
          if (!open) setPlanned(null);
        }}
        title={planned?.title || '后续课程'}
      >
        <div className="planned-preview">
          <span className="source-type">计划中 · 尚未交付</span>
          <h2>{planned?.objective}</h2>
          <p>将继续阅读同一个 nanochat 项目，沿下列源码展开。当前版本先完成第一节样板课。</p>
          <ul>
            {planned?.files.map((path) => (
              <li key={path}>
                <code>{path}</code>
              </li>
            ))}
          </ul>
          <p className="muted">详细里程碑见项目的课程地图和发布计划。</p>
        </div>
      </Dialog>
    </div>
  );
}

import { useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  MarkerType,
  type Node,
  type Edge,
} from '@xyflow/react';
import dagre from '@dagrejs/dagre';
import { Search } from 'lucide-react';
import type { LearningGraph } from '@llm/contracts';
import { Button } from './ui/button';
import '@xyflow/react/dist/style.css';

const kinds = {
  knowledge: '知识',
  step: '步骤',
  file: '文件',
  method: '方法',
  code: '代码块',
  experiment: '实验',
};
const relations = {
  prerequisite: '前置',
  teaches: '教学关联',
  contains: '包含',
  calls: '调用 · 已核验',
  verifies: '验证',
};

export function GraphView({
  graph,
  stepId,
  onSelect,
}: {
  graph: LearningGraph;
  stepId: string;
  onSelect: (node: LearningGraph['nodes'][number]) => void;
}) {
  const [whole, setWhole] = useState(false);
  const [search, setSearch] = useState('');
  const { nodes, edges } = useMemo(() => {
    const visible = graph.nodes.filter((node) => whole || node.stepIds.includes(stepId));
    const ids = new Set(visible.map((node) => node.id));
    const connections = graph.edges.filter((edge) => ids.has(edge.source) && ids.has(edge.target));
    const layout = new dagre.graphlib.Graph()
      .setGraph({ rankdir: 'LR', ranksep: 110, nodesep: 45 })
      .setDefaultEdgeLabel(() => ({}));
    visible.forEach((node) => layout.setNode(node.id, { width: 194, height: 62 }));
    connections.forEach((edge) => layout.setEdge(edge.source, edge.target));
    dagre.layout(layout);
    const nodes: Node[] = visible.map((node) => ({
      id: node.id,
      position: { x: layout.node(node.id).x - 97, y: layout.node(node.id).y - 31 },
      data: {
        label: (
          <div className="graph-node-label">
            <span>{kinds[node.kind]}</span>
            <strong>{node.label}</strong>
          </div>
        ),
      },
      className: `graph-node graph-${node.kind} ${search && !node.label.toLowerCase().includes(search.toLowerCase()) ? 'graph-dim' : ''}`,
      ariaLabel: `${kinds[node.kind]}：${node.label}`,
      sourcePosition: 'right' as Node['sourcePosition'],
      targetPosition: 'left' as Node['targetPosition'],
    }));
    const edges: Edge[] = connections.map((edge) => ({
      ...edge,
      label: relations[edge.kind],
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeDasharray: edge.kind === 'teaches' ? '5 4' : undefined },
    }));
    return { nodes, edges };
  }, [graph, stepId, whole, search]);
  return (
    <section className="graph-view">
      <div className="graph-toolbar">
        <div>
          <Button size="sm" variant={!whole ? 'outline' : 'ghost'} onClick={() => setWhole(false)}>
            本知识点最小闭环
          </Button>
          <Button size="sm" variant={whole ? 'outline' : 'ghost'} onClick={() => setWhole(true)}>
            整课网络
          </Button>
        </div>
        <label className="search-box">
          <Search size={15} />
          <input
            aria-label="搜索关系网络"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="查找文件、方法、知识…"
          />
        </label>
      </div>
      <div className="graph-canvas">
        <ReactFlow
          key={`${stepId}-${whole}`}
          nodes={nodes}
          edges={edges}
          fitView
          minZoom={0.25}
          maxZoom={1.6}
          nodesDraggable={false}
          nodesConnectable={false}
          onNodeClick={(_event, node) => {
            const target = graph.nodes.find((entry) => entry.id === node.id);
            if (target) onSelect(target);
          }}
        >
          <Background gap={22} size={1} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable />
        </ReactFlow>
      </div>
      <p className="graph-legend">
        <span className="legend-dot" /> 实线：包含 / 已核验调用 / 验证 ·
        虚线：教学关联。点击节点，返回对应源码或讲解。
      </p>
    </section>
  );
}

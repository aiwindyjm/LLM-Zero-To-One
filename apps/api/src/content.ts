import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import {
  curriculumSchema,
  experimentDefinitionSchema,
  graphSchema,
  knowledgeSchema,
  lessonSchema,
  sourceSchema,
  UPSTREAM_SHA,
  type Catalog,
} from '@llm/contracts';
import { z } from 'zod';

export interface SourceManifest {
  repository: string;
  commit: string;
  parent: string;
  message: string;
  date: string;
  license: string;
  files: { path: string; sha256: string }[];
  changes: {
    filename: string;
    status: string;
    patch?: string;
    additions: number;
    deletions: number;
  }[];
}

export function loadContent(
  root: string,
  lessonId = 'nanochat-forward',
  lessonVersion?: string,
): Catalog {
  const read = (file: string): unknown =>
    JSON.parse(readFileSync(resolve(root, 'content', file), 'utf8'));
  const registry = z
    .array(
      z.object({
        id: z.string(),
        version: z.string(),
        directory: z
          .string()
          .regex(/^[a-z0-9/-]*$/)
          .refine((value) => !value.includes('..')),
      }),
    )
    .parse(read('lessons.json'));
  const entry = registry.find(
    (item) => item.id === lessonId && (!lessonVersion || item.version === lessonVersion),
  );
  if (!entry) throw Object.assign(new Error('课程或课程版本不存在。'), { statusCode: 404 });
  const local = (file: string) => read(`${entry.directory}${file}`);
  const lesson = lessonSchema.parse(local(`lessons/${entry.id}.json`));
  if (lesson.id !== entry.id || lesson.version !== entry.version)
    throw new Error('Lesson registry identity mismatch');
  return {
    lesson,
    sources: z.array(sourceSchema).parse(read('sources.json')),
    knowledge: z.array(knowledgeSchema).parse(local('knowledge.json')),
    graph: graphSchema.parse(local('graph.json')),
    curriculum: curriculumSchema.parse(read('curriculum.json')),
    experiment: experimentDefinitionSchema.parse(local('experiment.json')),
  };
}

export function loadAssessments(root: string, catalog: Catalog) {
  const registry = JSON.parse(readFileSync(resolve(root, 'content/lessons.json'), 'utf8')) as {
    id: string;
    version: string;
    directory: string;
  }[];
  const entry = registry.find(
    (item) => item.id === catalog.lesson.id && item.version === catalog.lesson.version,
  )!;
  return z
    .record(z.string(), z.object({ answer: z.string(), feedback: z.string() }))
    .parse(
      JSON.parse(
        readFileSync(resolve(root, 'content', entry.directory, 'assessments.json'), 'utf8'),
      ),
    );
}

export function validateLibrary(root: string): Catalog[] {
  const registry = JSON.parse(readFileSync(resolve(root, 'content/lessons.json'), 'utf8')) as {
    id: string;
    version: string;
  }[];
  if (new Set(registry.map((item) => `${item.id}:${item.version}`)).size !== registry.length)
    throw new Error('Duplicate lesson version');
  const catalogs = registry.map((item) => validateContent(root, item.id, item.version));
  for (const chapter of catalogs[0].curriculum) {
    if (
      chapter.status === 'available' &&
      !catalogs.some((item) => item.lesson.id === chapter.lessonId)
    )
      throw new Error(`Missing available lesson: ${chapter.id}`);
  }
  return catalogs;
}

export function loadManifest(root: string): SourceManifest {
  return JSON.parse(
    readFileSync(resolve(root, 'data/upstream/manifest.json'), 'utf8'),
  ) as SourceManifest;
}

export function readSource(root: string, path: string): string {
  const manifest = loadManifest(root);
  const file = manifest.files.find((entry) => entry.path === path);
  if (!file) throw new Error('Source file is not in the pinned manifest');
  return readFileSync(resolve(root, 'data/upstream/nanochat', file.path), 'utf8');
}

export function validateContent(root: string, lessonId?: string, lessonVersion?: string): Catalog {
  const catalog = loadContent(root, lessonId, lessonVersion);
  const assessments = loadAssessments(root, catalog);
  const manifest = loadManifest(root);
  if (manifest.commit !== UPSTREAM_SHA || catalog.lesson.commit !== UPSTREAM_SHA)
    throw new Error('Upstream commit mismatch');
  for (const file of manifest.files) {
    const bytes = readFileSync(resolve(root, 'data/upstream/nanochat', file.path));
    if (createHash('sha256').update(bytes).digest('hex') !== file.sha256)
      throw new Error(`Source checksum mismatch: ${file.path}`);
  }
  const ensureUnique = (ids: string[], label: string) => {
    if (ids.length !== new Set(ids).size) throw new Error(`Duplicate ${label}`);
  };
  const steps = catalog.lesson.steps;
  ensureUnique(
    steps.map((step) => step.id),
    'steps',
  );
  ensureUnique(
    catalog.sources.map((source) => source.id),
    'sources',
  );
  ensureUnique(
    catalog.knowledge.map((item) => item.id),
    'knowledge',
  );
  ensureUnique(
    catalog.graph.nodes.map((node) => node.id),
    'nodes',
  );
  ensureUnique(
    catalog.graph.edges.map((edge) => edge.id),
    'edges',
  );
  const referenceIds = new Set(steps.flatMap((step) => step.code.map((code) => code.id)));
  ensureUnique(
    steps.flatMap((step) => step.code.map((code) => code.id)),
    'code references',
  );
  const sourceIds = new Set(catalog.sources.map((source) => source.id));
  const knowledgeIds = new Set(catalog.knowledge.map((item) => item.id));
  const stepIds = new Set(steps.map((step) => step.id));
  for (const step of steps) {
    if (
      step.orientation &&
      (!step.orientation.check.choices.includes(step.orientation.check.answer) ||
        !step.knowledgeIds.includes(step.orientation.knowledgeId))
    )
      throw new Error(`Invalid orientation check: ${step.id}`);
    if (!assessments[step.id] || !step.choices.includes(assessments[step.id].answer))
      throw new Error(`Missing assessment: ${step.id}`);
    ensureUnique(
      step.diagram.anchors.map((anchor) => anchor.id),
      'diagram anchors',
    );
    for (const anchor of step.diagram.anchors) {
      const code = step.code.find((reference) => reference.id === anchor.codeId);
      if (
        !code ||
        !step.knowledgeIds.includes(anchor.knowledgeId) ||
        anchor.startLine < code.startLine ||
        anchor.endLine > code.endLine ||
        anchor.endLine < anchor.startLine
      )
        throw new Error(`Invalid diagram anchor: ${anchor.id}`);
    }
    if (
      step.knowledgeIds.some((id) => !knowledgeIds.has(id)) ||
      step.sourceIds.some((id) => !sourceIds.has(id))
    )
      throw new Error(`Missing teaching reference: ${step.id}`);
    if (step.experimentId !== catalog.experiment.id)
      throw new Error(`Missing experiment: ${step.id}`);
    for (const code of step.code) {
      const source = readSource(root, code.file).trimEnd().split('\n');
      if (code.commit !== manifest.commit || code.endLine > source.length)
        throw new Error(`Invalid source anchor: ${code.id}`);
    }
  }
  const verifyDag = (entries: { id: string; prerequisites: string[] }[]) => {
    const pending = new Set<string>();
    const visited = new Set<string>();
    const visit = (id: string) => {
      if (pending.has(id)) throw new Error(`Prerequisite cycle: ${id}`);
      if (visited.has(id)) return;
      const entry = entries.find((candidate) => candidate.id === id);
      if (!entry) throw new Error(`Unknown prerequisite: ${id}`);
      pending.add(id);
      entry.prerequisites.forEach(visit);
      pending.delete(id);
      visited.add(id);
    };
    entries.forEach((entry) => visit(entry.id));
  };
  verifyDag(steps);
  verifyDag(catalog.curriculum);
  for (const item of catalog.knowledge)
    if (item.sourceIds.some((id) => !sourceIds.has(id)))
      throw new Error(`Missing knowledge source: ${item.id}`);
  const nodeIds = new Set(catalog.graph.nodes.map((node) => node.id));
  for (const node of catalog.graph.nodes) {
    if (
      node.stepIds.some((id) => !stepIds.has(id)) ||
      (node.codeId && !referenceIds.has(node.codeId))
    )
      throw new Error(`Invalid graph anchor: ${node.id}`);
    if (node.knowledgeId && !knowledgeIds.has(node.knowledgeId))
      throw new Error(`Unknown knowledge node: ${node.id}`);
    if (node.file) readSource(root, node.file);
  }
  for (const edge of catalog.graph.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target))
      throw new Error(`Dangling edge: ${edge.id}`);
    if (edge.evidenceCodeId && !referenceIds.has(edge.evidenceCodeId))
      throw new Error(`Missing call evidence: ${edge.id}`);
  }
  return catalog;
}

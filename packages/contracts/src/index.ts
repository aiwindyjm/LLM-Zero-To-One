import { z } from 'zod';

export const UPSTREAM_SHA = '92d63d4e8bb4df75c3b71618f31ddde2378b2bcd';
export const LESSON_ID = 'nanochat-forward';
export const LESSON_VERSION = '1.0.0';

export const codeReferenceSchema = z
  .object({
    id: z.string(),
    repository: z.url(),
    commit: z.string().regex(/^[a-f0-9]{40}$/),
    file: z
      .string()
      .regex(/^[\w./-]+$/)
      .refine((value) => !value.includes('..')),
    symbol: z.string(),
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive(),
  })
  .refine((value) => value.endLine >= value.startLine, 'Invalid source range');
export type CodeReference = z.infer<typeof codeReferenceSchema>;

export const learningStepSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string(),
  objective: z.string(),
  prerequisites: z.array(z.string()),
  code: z.array(codeReferenceSchema),
  knowledgeIds: z.array(z.string()),
  sourceIds: z.array(z.string()),
  explanation: z.string(),
  input: z.string(),
  output: z.string(),
  question: z.string(),
  choices: z.array(z.string()),
  experimentId: z.string(),
});
export type LearningStep = z.infer<typeof learningStepSchema>;

export const lessonSchema = z.object({
  id: z.string(),
  version: z.string(),
  title: z.string(),
  summary: z.string(),
  estimatedMinutes: z.number().positive(),
  commit: z.string(),
  steps: z.array(learningStepSchema).min(1),
});
export type Lesson = z.infer<typeof lessonSchema>;

export const sourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  url: z.url(),
  type: z.enum(['source', 'official', 'paper']),
  relevance: z.string(),
  verifiedAt: z.string(),
});
export type Source = z.infer<typeof sourceSchema>;

export const knowledgeSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  misconception: z.string(),
  sourceIds: z.array(z.string()),
  status: z.literal('reviewed'),
});
export type Knowledge = z.infer<typeof knowledgeSchema>;

export const graphNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(['knowledge', 'step', 'file', 'method', 'code', 'experiment']),
  stepIds: z.array(z.string()),
  codeId: z.string().optional(),
  knowledgeId: z.string().optional(),
  file: z.string().optional(),
});
export const knowledgeRelationSchema = z
  .object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    kind: z.enum(['prerequisite', 'teaches', 'contains', 'calls', 'verifies']),
    evidenceCodeId: z.string().optional(),
  })
  .refine(
    (value) => value.kind !== 'calls' || Boolean(value.evidenceCodeId),
    'Calls need source evidence',
  );
export type KnowledgeRelation = z.infer<typeof knowledgeRelationSchema>;
export const graphSchema = z.object({
  nodes: z.array(graphNodeSchema),
  edges: z.array(knowledgeRelationSchema),
});
export type LearningGraph = z.infer<typeof graphSchema>;

export const experimentRequestSchema = z
  .object({
    lessonId: z.literal(LESSON_ID),
    lessonVersion: z.literal(LESSON_VERSION),
    experimentId: z.literal('forward-trace'),
    preset: z.enum(['cpu', 'cuda']),
    sequenceLength: z.union([z.literal(8), z.literal(16), z.literal(32)]),
  })
  .strict();
export type ExperimentRequest = z.infer<typeof experimentRequestSchema>;
export const experimentDefinitionSchema = z.object({
  id: z.literal('forward-trace'),
  title: z.string(),
  description: z.string(),
  presets: z.array(z.enum(['cpu', 'cuda'])),
  timeoutSeconds: z.number().int().positive(),
  inputLengths: z.array(z.number()),
  commit: z.string(),
});
export type ExperimentDefinition = z.infer<typeof experimentDefinitionSchema>;

export const experimentResultSchema = z.object({
  commit: z.literal(UPSTREAM_SHA),
  device: z.string(),
  dtype: z.string(),
  durationSeconds: z.number().nonnegative(),
  peakMemoryMb: z.number().nonnegative(),
  sequenceLength: z.number().int(),
  batchSize: z.literal(2),
  shapes: z.record(z.string(), z.array(z.number().int())),
  nextTokenIds: z.array(z.number().int()),
  probabilitiesSum: z.array(z.number()),
  modelParameters: z.number().int(),
  seed: z.number().int(),
  pythonVersion: z.string(),
  torchVersion: z.string(),
});
export type ExperimentResult = z.infer<typeof experimentResultSchema>;
export const runStatusSchema = z.enum([
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
  'interrupted',
]);
export type RunStatus = z.infer<typeof runStatusSchema>;
export interface ExperimentRun extends ExperimentRequest {
  id: string;
  status: RunStatus;
  createdAt: string;
  updatedAt: string;
  error: string | null;
  result: ExperimentResult | null;
}
export interface RunEvent {
  id: number;
  runId: string;
  kind: string;
  message: string;
  createdAt: string;
}
export interface AssessmentAttempt {
  id: string;
  lessonId: string;
  lessonVersion: string;
  stepId: string;
  answer: string;
  explanation: string;
  objectivePassed: boolean;
  explanationStatus: 'recorded';
  runId: string | null;
  createdAt: string;
}
export const assessmentRequestSchema = z
  .object({
    lessonId: z.literal(LESSON_ID),
    lessonVersion: z.literal(LESSON_VERSION),
    stepId: z.string(),
    answer: z.string().max(120),
    explanation: z.string().min(12, '请用至少 12 个字符记录你的理解').max(4000),
    runId: z.string().optional(),
  })
  .strict();
export const progressRequestSchema = z
  .object({
    lessonId: z.literal(LESSON_ID),
    lessonVersion: z.literal(LESSON_VERSION),
    stepId: z.string(),
  })
  .strict();
export interface StepProgress {
  stepId: string;
  status: 'viewed' | 'practiced' | 'verified';
  updatedAt: string;
}
export const tutorRequestSchema = z
  .object({
    lessonId: z.literal(LESSON_ID),
    lessonVersion: z.literal(LESSON_VERSION),
    stepId: z.string(),
    message: z.string().min(1).max(4000),
    mode: z.enum(['explain', 'hint']),
  })
  .strict();
export interface TutorMessage {
  id: string;
  stepId: string;
  role: 'user' | 'assistant';
  text: string;
  createdAt: string;
}
export interface EnvironmentStatus {
  ready: boolean;
  gpuAvailable: boolean;
  gpuName: string | null;
  python: string | null;
  torch: string | null;
  commit: string | null;
  message: string;
  tutorConfigured: boolean;
}
export const curriculumSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    objective: z.string(),
    status: z.enum(['available', 'planned']),
    lessonId: z.string().optional(),
    files: z.array(z.string()),
    prerequisites: z.array(z.string()),
  }),
);
export interface Catalog {
  lesson: Lesson;
  sources: Source[];
  knowledge: Knowledge[];
  graph: LearningGraph;
  curriculum: z.infer<typeof curriculumSchema>;
  experiment: ExperimentDefinition;
}

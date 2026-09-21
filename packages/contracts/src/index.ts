import { z } from 'zod';

export const UPSTREAM_SHA = '92d63d4e8bb4df75c3b71618f31ddde2378b2bcd';
export const LESSON_ID = 'nanochat-forward';
export const LESSON_VERSION = '1.0.0';
export const lessonIdentitySchema = z.object({
  lessonId: z.string().regex(/^[a-z0-9-]{1,80}$/),
  lessonVersion: z.string().regex(/^\d+\.\d+\.\d+$/),
});
export const lessonQuerySchema = lessonIdentitySchema.partial();

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
  diagram: z.object({
    kind: z.enum([
      'input',
      'embedding',
      'block',
      'logits',
      'prediction',
      'tokenize',
      'batch',
      'targets',
    ]),
    prompt: z.string(),
    anchors: z
      .array(
        z.object({
          id: z.string(),
          label: z.string(),
          codeId: z.string(),
          knowledgeId: z.string(),
          startLine: z.number().int().positive(),
          endLine: z.number().int().positive(),
        }),
      )
      .min(1),
  }),
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
    ...lessonIdentitySchema.shape,
    experimentId: z.enum(['forward-trace', 'data-trace']),
    preset: z.enum(['cpu', 'cuda']),
    sequenceLength: z.union([z.literal(8), z.literal(16), z.literal(32)]),
  })
  .strict();
export type ExperimentRequest = z.infer<typeof experimentRequestSchema>;
export const experimentDefinitionSchema = z.object({
  id: z.enum(['forward-trace', 'data-trace']),
  title: z.string(),
  description: z.string(),
  presets: z.array(z.enum(['cpu', 'cuda'])),
  timeoutSeconds: z.number().int().positive(),
  inputLengths: z.array(z.number()),
  commit: z.string(),
});
export type ExperimentDefinition = z.infer<typeof experimentDefinitionSchema>;

const vectorSlice = z.array(z.number()).length(8);
export const experimentTraceSchema = z.object({
  version: z.literal(1),
  dimensionIndices: z.array(z.number().int()).length(8),
  inputIds: z.array(z.array(z.number().int().min(0).max(255)).min(8).max(32)).length(2),
  samples: z
    .array(
      z.object({
        batch: z.number().int().min(0).max(1),
        position: z.number().int().min(0).max(31),
        tokenId: z.number().int().min(0).max(255),
        vectors: z.object({
          embedding: vectorSlice,
          block_0_input: vectorSlice,
          block_0: vectorSlice,
          block_1_input: vectorSlice,
          block_1: vectorSlice,
          hidden: vectorSlice,
          logits: vectorSlice,
        }),
      }),
    )
    .length(6),
  candidates: z
    .array(
      z
        .array(
          z.object({
            tokenId: z.number().int().min(0).max(255),
            logit: z.number(),
            probability: z.number().min(0).max(1),
          }),
        )
        .length(5),
    )
    .length(2),
});
export type ExperimentTrace = z.infer<typeof experimentTraceSchema>;
export const dataTraceSchema = z.object({
  version: z.literal(1),
  tokenizer: z.literal('nanochat.RustBPETokenizer'),
  vocabSize: z.number().int().min(265).max(512),
  bosId: z.number().int().nonnegative(),
  documents: z
    .array(
      z.object({
        text: z.string().max(1000),
        ids: z.array(z.number().int()).max(1000),
        decoded: z.string().max(1000),
      }),
    )
    .length(2),
  inputs: z.array(z.array(z.number().int().nonnegative()).min(8).max(32)).length(2),
  targets: z.array(z.array(z.number().int().nonnegative()).min(8).max(32)).length(2),
});
export type DataTrace = z.infer<typeof dataTraceSchema>;
export const experimentResultSchema = z
  .object({
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
    trace: experimentTraceSchema.optional(),
    dataTrace: dataTraceSchema.optional(),
  })
  .superRefine((result, context) => {
    const data = result.dataTrace;
    if (
      data &&
      (result.trace ||
        data.inputs.some(
          (row, batch) =>
            row.length !== result.sequenceLength ||
            row[0] !== data.bosId ||
            data.targets[batch].length !== row.length ||
            row.slice(1).some((id, index) => id !== data.targets[batch][index]),
        ) ||
        [...data.inputs, ...data.targets].some((row) => row.some((id) => id >= data.vocabSize)) ||
        data.documents.some(
          (doc) => doc.text !== doc.decoded || doc.ids.some((id) => id < 0 || id >= data.vocabSize),
        ))
    )
      context.addIssue({
        code: 'custom',
        path: ['dataTrace'],
        message: 'Data trace has inconsistent shifts, vocabulary or round-trip',
      });
    const trace = result.trace;
    if (!trace) return;
    const positions = [0, 1, result.sequenceLength - 1];
    const expected = new Set(
      [0, 1].flatMap((batch) => positions.map((position) => `${batch}:${position}`)),
    );
    const actual = new Set(trace.samples.map((sample) => `${sample.batch}:${sample.position}`));
    if (
      trace.inputIds.some((row) => row.length !== result.sequenceLength) ||
      trace.dimensionIndices.some((dimension, index) => dimension !== index) ||
      actual.size !== expected.size ||
      [...expected].some((key) => !actual.has(key)) ||
      trace.samples.some(
        (sample) => trace.inputIds[sample.batch]?.[sample.position] !== sample.tokenId,
      ) ||
      trace.candidates.some(
        (candidates, batch) =>
          candidates[0].tokenId !== result.nextTokenIds[batch] ||
          new Set(candidates.map((candidate) => candidate.tokenId)).size !== 5 ||
          candidates.reduce((sum, candidate) => sum + candidate.probability, 0) > 1.00001,
      )
    )
      context.addIssue({
        code: 'custom',
        path: ['trace'],
        message: 'Trace does not match result dimensions, sampled positions or predictions',
      });
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
  explanationStatus: 'recorded' | 'not_provided';
  runId: string | null;
  createdAt: string;
}
export const assessmentRequestSchema = z
  .object({
    ...lessonIdentitySchema.shape,
    stepId: z.string(),
    answer: z.string().max(120),
    explanation: z.string().trim().max(4000).default(''),
    runId: z.string().optional(),
  })
  .strict();
export const progressRequestSchema = z
  .object({
    ...lessonIdentitySchema.shape,
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
    ...lessonIdentitySchema.shape,
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

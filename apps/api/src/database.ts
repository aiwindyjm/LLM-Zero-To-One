import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { asc, desc, eq, and } from 'drizzle-orm';
import type {
  AssessmentAttempt,
  ExperimentRequest,
  ExperimentResult,
  ExperimentRun,
  RunEvent,
  RunStatus,
  StepProgress,
  TutorMessage,
} from '@llm/contracts';

const runs = sqliteTable('experiment_runs', {
  id: text('id').primaryKey(),
  lessonId: text('lesson_id').notNull(),
  lessonVersion: text('lesson_version').notNull(),
  experimentId: text('experiment_id').notNull(),
  preset: text('preset').notNull(),
  sequenceLength: integer('sequence_length').notNull(),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  error: text('error'),
  result: text('result', { mode: 'json' }).$type<ExperimentResult>(),
});
const events = sqliteTable('run_events', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  runId: text('run_id')
    .notNull()
    .references(() => runs.id),
  kind: text('kind').notNull(),
  message: text('message').notNull(),
  createdAt: text('created_at').notNull(),
});
const progress = sqliteTable('progress', {
  key: text('key').primaryKey(),
  lessonId: text('lesson_id').notNull(),
  lessonVersion: text('lesson_version').notNull(),
  stepId: text('step_id').notNull(),
  status: text('status').notNull(),
  updatedAt: text('updated_at').notNull(),
});
const attempts = sqliteTable('assessment_attempts', {
  id: text('id').primaryKey(),
  lessonId: text('lesson_id').notNull(),
  lessonVersion: text('lesson_version').notNull(),
  stepId: text('step_id').notNull(),
  answer: text('answer').notNull(),
  explanation: text('explanation').notNull(),
  objectivePassed: integer('objective_passed', { mode: 'boolean' }).notNull(),
  runId: text('run_id'),
  createdAt: text('created_at').notNull(),
});
const messages = sqliteTable('tutor_messages', {
  id: text('id').primaryKey(),
  lessonId: text('lesson_id').notNull(),
  lessonVersion: text('lesson_version').notNull(),
  stepId: text('step_id').notNull(),
  role: text('role').notNull(),
  text: text('text').notNull(),
  createdAt: text('created_at').notNull(),
});

export class Store {
  readonly sqlite: Database.Database;
  readonly db: ReturnType<typeof drizzle>;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.sqlite = new Database(path);
    this.sqlite.pragma('journal_mode = WAL');
    this.sqlite.pragma('foreign_keys = ON');
    this.sqlite.exec(`
      BEGIN;
      CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY);
      CREATE TABLE IF NOT EXISTS experiment_runs (
        id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL, lesson_version TEXT NOT NULL,
        experiment_id TEXT NOT NULL, preset TEXT NOT NULL, sequence_length INTEGER NOT NULL,
        status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL, error TEXT, result TEXT
      );
      CREATE TABLE IF NOT EXISTS run_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT, run_id TEXT NOT NULL REFERENCES experiment_runs(id),
        kind TEXT NOT NULL, message TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS run_events_run_id ON run_events(run_id, id);
      CREATE TABLE IF NOT EXISTS progress (
        key TEXT PRIMARY KEY, lesson_id TEXT NOT NULL, lesson_version TEXT NOT NULL,
        step_id TEXT NOT NULL, status TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS assessment_attempts (
        id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL, lesson_version TEXT NOT NULL,
        step_id TEXT NOT NULL, answer TEXT NOT NULL, explanation TEXT NOT NULL,
        objective_passed INTEGER NOT NULL, run_id TEXT REFERENCES experiment_runs(id), created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tutor_messages (
        id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL, lesson_version TEXT NOT NULL,
        step_id TEXT NOT NULL, role TEXT NOT NULL, text TEXT NOT NULL, created_at TEXT NOT NULL
      );
      INSERT OR IGNORE INTO schema_migrations VALUES (1);
      COMMIT;
    `);
    this.db = drizzle(this.sqlite);
    for (const status of ['running', 'queued']) {
      this.db
        .update(runs)
        .set({
          status: 'interrupted',
          error: '服务已重启，请重新运行实验。',
          updatedAt: new Date().toISOString(),
        })
        .where(eq(runs.status, status))
        .run();
    }
  }

  createRun(input: ExperimentRequest): ExperimentRun {
    const timestamp = new Date().toISOString();
    const run: ExperimentRun = {
      ...input,
      id: randomUUID(),
      status: 'queued',
      createdAt: timestamp,
      updatedAt: timestamp,
      error: null,
      result: null,
    };
    this.db.insert(runs).values(run).run();
    this.event(run.id, 'status', 'queued');
    return run;
  }

  getRun(id: string): ExperimentRun | undefined {
    return this.db.select().from(runs).where(eq(runs.id, id)).get() as ExperimentRun | undefined;
  }

  listRuns(): ExperimentRun[] {
    return this.db
      .select()
      .from(runs)
      .orderBy(desc(runs.createdAt))
      .limit(50)
      .all() as ExperimentRun[];
  }

  updateRun(
    id: string,
    status: RunStatus,
    error: string | null = null,
    result: ExperimentResult | null = null,
  ) {
    this.db
      .update(runs)
      .set({ status, error, result, updatedAt: new Date().toISOString() })
      .where(eq(runs.id, id))
      .run();
    this.event(id, 'status', status);
  }

  event(runId: string, kind: string, message: string) {
    return this.db
      .insert(events)
      .values({
        runId,
        kind,
        message: message.slice(0, 12000),
        createdAt: new Date().toISOString(),
      })
      .returning()
      .get();
  }

  getEvents(runId: string): RunEvent[] {
    return this.db
      .select()
      .from(events)
      .where(eq(events.runId, runId))
      .orderBy(asc(events.id))
      .all();
  }

  getProgress(lessonId: string, lessonVersion: string): StepProgress[] {
    return this.db
      .select({ stepId: progress.stepId, status: progress.status, updatedAt: progress.updatedAt })
      .from(progress)
      .where(and(eq(progress.lessonId, lessonId), eq(progress.lessonVersion, lessonVersion)))
      .all() as StepProgress[];
  }

  setProgress(
    lessonId: string,
    lessonVersion: string,
    stepId: string,
    status: StepProgress['status'],
  ) {
    const key = `${lessonId}:${lessonVersion}:${stepId}`;
    const previous = this.db.select().from(progress).where(eq(progress.key, key)).get();
    const ranks = { viewed: 1, practiced: 2, verified: 3 };
    if (previous && ranks[previous.status as StepProgress['status']] > ranks[status]) return;
    const entry = {
      key,
      lessonId,
      lessonVersion,
      stepId,
      status,
      updatedAt: new Date().toISOString(),
    };
    this.db
      .insert(progress)
      .values(entry)
      .onConflictDoUpdate({ target: progress.key, set: entry })
      .run();
  }

  saveAttempt(
    input: Omit<AssessmentAttempt, 'id' | 'createdAt' | 'explanationStatus'>,
  ): AssessmentAttempt {
    const entry = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    this.db.insert(attempts).values(entry).run();
    return { ...entry, explanationStatus: entry.explanation.trim() ? 'recorded' : 'not_provided' };
  }

  listAttempts(lessonId: string, lessonVersion: string): AssessmentAttempt[] {
    return this.db
      .select()
      .from(attempts)
      .where(and(eq(attempts.lessonId, lessonId), eq(attempts.lessonVersion, lessonVersion)))
      .orderBy(desc(attempts.createdAt))
      .all()
      .map((entry) => ({
        ...entry,
        explanationStatus: entry.explanation.trim()
          ? ('recorded' as const)
          : ('not_provided' as const),
      }));
  }

  saveMessage(
    lessonId: string,
    lessonVersion: string,
    stepId: string,
    role: TutorMessage['role'],
    content: string,
  ): TutorMessage {
    const entry = {
      id: randomUUID(),
      lessonId,
      lessonVersion,
      stepId,
      role,
      text: content,
      createdAt: new Date().toISOString(),
    };
    this.db.insert(messages).values(entry).run();
    return entry;
  }

  getMessages(lessonId: string, lessonVersion: string, stepId: string): TutorMessage[] {
    return (
      this.db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.lessonId, lessonId),
            eq(messages.lessonVersion, lessonVersion),
            eq(messages.stepId, stepId),
          ),
        )
        .orderBy(desc(messages.createdAt))
        .limit(20)
        .all() as TutorMessage[]
    ).reverse();
  }

  close() {
    this.sqlite.close();
  }
}

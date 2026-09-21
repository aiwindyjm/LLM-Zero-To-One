import Fastify from 'fastify';
import fastifyStatic from '@fastify/static';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { ZodError } from 'zod';
import {
  assessmentRequestSchema,
  experimentRequestSchema,
  progressRequestSchema,
  tutorRequestSchema,
  LESSON_ID,
  lessonQuerySchema,
} from '@llm/contracts';
import { validateLibrary, loadAssessments, readSource, loadManifest } from './content.js';
import { Store } from './database.js';
import { JobManager } from './jobs.js';
import { tutorContext, streamCompletion, verifyTutorCitations } from './tutor.js';

export interface AppOptions {
  root: string;
  database: string;
  jobs?: (store: Store) => JobManager;
  logger?: boolean;
}

export async function createApp(options: AppOptions) {
  const catalogs = validateLibrary(options.root);
  const resolveCatalog = (identity: unknown) => {
    const query = lessonQuerySchema.parse(identity);
    const id = query.lessonId || LESSON_ID;
    const catalog = catalogs.find(
      (item) =>
        item.lesson.id === id &&
        (!query.lessonVersion || item.lesson.version === query.lessonVersion),
    );
    if (!catalog) throw Object.assign(new Error('课程或课程版本不存在。'), { statusCode: 404 });
    return catalog;
  };
  const store = new Store(options.database);
  const jobs = options.jobs?.(store) || new JobManager(options.root, store);
  const app = Fastify({ logger: options.logger ?? false, bodyLimit: 65536 });
  const sessionToken = randomUUID();

  app.addHook('onRequest', async (request, reply) => {
    const host = request.headers.host?.split(':')[0];
    if (host && !['127.0.0.1', 'localhost', '['].includes(host))
      return reply.code(403).send({ message: '仅允许本机访问。' });
    const origin = request.headers.origin;
    if (origin) {
      try {
        const url = new URL(origin);
        const port = process.env.PORT || '4310';
        if (
          ![
            `http://127.0.0.1:${port}`,
            `http://localhost:${port}`,
            'http://127.0.0.1:5173',
            'http://localhost:5173',
          ].includes(url.origin)
        )
          return reply.code(403).send({ message: '不允许的请求来源。' });
      } catch {
        return reply.code(403).send({ message: '无效请求来源。' });
      }
    }
    if (
      !['GET', 'HEAD', 'OPTIONS'].includes(request.method) &&
      request.headers['x-local-token'] !== sessionToken
    )
      return reply.code(403).send({ message: '本机会话已失效，请刷新页面。' });
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('X-Frame-Options', 'DENY');
  });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ZodError)
      return reply
        .code(400)
        .send({ message: error.issues.map((issue) => issue.message).join('；') });
    if (
      error instanceof Error &&
      'statusCode' in error &&
      typeof error.statusCode === 'number' &&
      error.statusCode < 500
    )
      return reply.code(error.statusCode).send({ message: error.message });
    app.log.error(error);
    return reply.code(500).send({ message: '服务处理失败，请查看本机服务日志。' });
  });

  app.get('/api/health', async () => ({ ok: true }));
  app.get('/api/session', async (_request, reply) => {
    reply.header('Cache-Control', 'no-store');
    return { token: sessionToken };
  });
  app.get('/api/lessons', async () =>
    catalogs.map(({ lesson }) => ({ id: lesson.id, version: lesson.version, title: lesson.title })),
  );
  app.get('/api/catalog', async (request) => resolveCatalog(request.query));
  app.get('/api/source', async (request, reply) => {
    const { file } = request.query as { file?: string };
    if (!file || !loadManifest(options.root).files.some((entry) => entry.path === file))
      return reply.code(404).send({ message: '源码文件不存在。' });
    const manifest = loadManifest(options.root);
    return {
      file,
      commit: manifest.commit,
      parent: manifest.parent,
      message: manifest.message,
      content: readSource(options.root, file),
      diff: manifest.changes.find((entry) => entry.filename === file)?.patch || null,
      files: manifest.files.map((entry) => entry.path),
    };
  });
  app.get('/api/environment', async () => jobs.diagnose());
  app.get('/api/progress', async (request) => {
    const { lesson } = resolveCatalog(request.query);
    return {
      steps: store.getProgress(lesson.id, lesson.version),
      attempts: store.listAttempts(lesson.id, lesson.version),
    };
  });
  app.post('/api/progress', async (request, reply) => {
    const input = progressRequestSchema.parse(request.body);
    const catalog = resolveCatalog(input);
    if (!catalog.lesson.steps.some((step) => step.id === input.stepId))
      return reply.code(404).send({ message: '学习步骤不存在。' });
    store.setProgress(input.lessonId, input.lessonVersion, input.stepId, 'viewed');
    return { ok: true };
  });
  app.post('/api/assessments', async (request, reply) => {
    const input = assessmentRequestSchema.parse(request.body);
    const catalog = resolveCatalog(input);
    if (!catalog.lesson.steps.some((step) => step.id === input.stepId))
      return reply.code(404).send({ message: '学习步骤不存在。' });
    const rubric = loadAssessments(options.root, catalog);
    const run = input.runId ? store.getRun(input.runId) : undefined;
    if (
      input.runId &&
      (!run ||
        run.status !== 'succeeded' ||
        run.lessonId !== input.lessonId ||
        run.lessonVersion !== input.lessonVersion ||
        run.experimentId !== catalog.experiment.id ||
        run.sequenceLength !== 8 ||
        run.result?.batchSize !== 2 ||
        run.result?.commit !== catalog.lesson.commit)
    )
      return reply.code(400).send({ message: '请关联本课程固定版本、B=2、T=8 的成功实验。' });
    const objectivePassed = input.answer === rubric[input.stepId].answer;
    const attempt = store.saveAttempt({ ...input, runId: run?.id || null, objectivePassed });
    store.setProgress(
      input.lessonId,
      input.lessonVersion,
      input.stepId,
      objectivePassed && run ? 'verified' : 'practiced',
    );
    return {
      attempt,
      feedback: rubric[input.stepId].feedback,
      note: input.explanation
        ? '这里只验证客观题与实验记录；你的解释已保存，尚未经过独立评审。'
        : '这里只验证客观题与实验记录；未记录解释。',
    };
  });
  app.get('/api/runs', async (request) => {
    const { lesson } = resolveCatalog(request.query);
    return store.listRuns(lesson.id, lesson.version);
  });
  app.post('/api/runs', async (request, reply) => {
    const input = experimentRequestSchema.parse(request.body);
    const catalog = resolveCatalog(input);
    if (
      input.experimentId !== catalog.experiment.id ||
      !catalog.experiment.presets.includes(input.preset) ||
      !catalog.experiment.inputLengths.includes(input.sequenceLength)
    )
      return reply.code(400).send({ message: '实验配置不属于所选课程。' });
    const environment = await jobs.diagnose();
    if (!environment.ready) return reply.code(503).send({ message: environment.message });
    if (input.preset === 'cuda' && !environment.gpuAvailable)
      return reply.code(400).send({ message: '没有检测到可用 CUDA 设备，请选择 CPU。' });
    try {
      return reply.code(201).send(jobs.enqueue(input));
    } catch (error) {
      return reply.code(429).send({ message: (error as Error).message });
    }
  });
  app.get('/api/runs/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const run = store.getRun(id);
    return run
      ? { run, events: store.getEvents(id) }
      : reply.code(404).send({ message: '实验记录不存在。' });
  });
  app.post('/api/runs/:id/cancel', async (request, reply) => {
    const { id } = request.params as { id: string };
    return jobs.cancel(id) ? { ok: true } : reply.code(404).send({ message: '实验记录不存在。' });
  });
  const streams = new Set<NodeJS.Timeout>();
  app.get('/api/runs/:id/events', async (request, reply) => {
    const { id } = request.params as { id: string };
    if (!store.getRun(id)) return reply.code(404).send({ message: '实验记录不存在。' });
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    let cursor = Number(request.headers['last-event-id']) || 0;
    const send = () => {
      for (const event of store.getEvents(id).filter((entry) => entry.id > cursor)) {
        reply.raw.write(`id: ${event.id}\ndata: ${JSON.stringify(event)}\n\n`);
        cursor = event.id;
      }
      const run = store.getRun(id)!;
      if (!['queued', 'running'].includes(run.status)) {
        reply.raw.write(`event: complete\ndata: ${JSON.stringify(run)}\n\n`);
        reply.raw.end();
      }
    };
    const timer = setInterval(send, 300);
    streams.add(timer);
    reply.raw.on('close', () => {
      clearInterval(timer);
      streams.delete(timer);
    });
    send();
  });

  app.get('/api/tutor/messages', async (request) => {
    const { lesson } = resolveCatalog(request.query);
    const { stepId = lesson.steps[0].id } = request.query as { stepId?: string };
    if (!lesson.steps.some((step) => step.id === stepId))
      throw Object.assign(new Error('学习步骤不存在。'), { statusCode: 404 });
    return store.getMessages(lesson.id, lesson.version, stepId);
  });
  let tutorBusy = false;
  app.post('/api/tutor', async (request, reply) => {
    const input = tutorRequestSchema.parse(request.body);
    const catalog = resolveCatalog(input);
    const step = catalog.lesson.steps.find((step) => step.id === input.stepId);
    if (!step) return reply.code(404).send({ message: '学习步骤不存在。' });
    if (!process.env.TUTOR_API_KEY || !process.env.TUTOR_MODEL)
      return reply.code(503).send({
        message: 'Tutor 尚未配置。请在服务端 .env 设置接口、模型和 Key；固定教材与实验仍可使用。',
      });
    if (tutorBusy) return reply.code(429).send({ message: 'Tutor 正在回答，请稍候。' });
    tutorBusy = true;
    const history = store.getMessages(input.lessonId, input.lessonVersion, step.id).slice(-8);
    store.saveMessage(input.lessonId, input.lessonVersion, step.id, 'user', input.message);
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 90000);
    reply.raw.on('close', () => controller.abort());
    const send = (data: unknown) => {
      if (!reply.raw.destroyed) reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };
    try {
      const text = await streamCompletion(
        [
          { role: 'system', content: tutorContext(options.root, catalog, step, input.mode) },
          ...history.map((message) => ({ role: message.role, content: message.text })),
          { role: 'user', content: input.message },
        ],
        (delta) => send({ kind: 'delta', text: delta }),
        controller.signal,
      );
      const checked = verifyTutorCitations(text, step.sourceIds);
      const message = store.saveMessage(
        input.lessonId,
        input.lessonVersion,
        step.id,
        'assistant',
        checked,
      );
      send({ kind: 'done', message });
    } catch (error) {
      send({
        kind: 'error',
        message: controller.signal.aborted
          ? '回答已中断或超时，请重试。'
          : (error as Error).message,
      });
    } finally {
      clearTimeout(timer);
      tutorBusy = false;
      reply.raw.end();
    }
  });

  const frontend = resolve(options.root, 'apps/web/dist');
  if (existsSync(frontend)) {
    await app.register(fastifyStatic, { root: frontend, prefix: '/' });
    app.setNotFoundHandler((request, reply) =>
      request.url.startsWith('/api/')
        ? reply.code(404).send({ message: 'API 不存在。' })
        : reply.sendFile('index.html'),
    );
  }
  app.addHook('onClose', async () => {
    streams.forEach(clearInterval);
    await jobs.close();
    store.close();
  });
  return { app, store, jobs };
}

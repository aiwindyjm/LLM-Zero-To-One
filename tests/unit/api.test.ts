import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { createApp } from '../../apps/api/src/app.js';
import { findRoot } from '../../apps/api/src/paths.js';
import { JobManager } from '../../apps/api/src/jobs.js';
import { Store } from '../../apps/api/src/database.js';

const root = findRoot();
const request = {
  lessonId: 'nanochat-forward' as const,
  lessonVersion: '1.0.0' as const,
  experimentId: 'forward-trace' as const,
  preset: 'cpu' as const,
  sequenceLength: 8 as const,
};
const applications: Awaited<ReturnType<typeof createApp>>[] = [];
afterEach(async () => {
  for (const application of applications.splice(0)) await application.app.close();
});
async function create(database = ':memory:') {
  const application = await createApp({
    root,
    database,
    jobs: (store) =>
      new JobManager(root, store, (diagnostic) => ({
        command: process.execPath,
        args: [
          resolve(root, 'tests/fixtures/worker.mjs'),
          'success',
          ...(diagnostic ? ['--diagnose'] : []),
        ],
      })),
  });
  applications.push(application);
  return application;
}
async function headers(application: Awaited<ReturnType<typeof create>>) {
  const session = await application.app.inject({ method: 'GET', url: '/api/session' });
  return { 'x-local-token': session.json().token };
}

describe('local API', () => {
  it('scopes Tutor history and applies the run limit within each course', async () => {
    const application = await create();
    application.store.saveMessage('nanochat-data', '1.0.0', 'tokenize', 'user', 'data question');
    application.store.saveMessage('nanochat-data', '2.0.0', 'tokenize', 'user', 'future question');
    application.store.saveMessage('nanochat-forward', '1.0.0', 'input', 'user', 'forward question');
    const messages = await application.app.inject({
      url: '/api/tutor/messages?lessonId=nanochat-data&lessonVersion=1.0.0&stepId=tokenize',
    });
    expect(messages.json().map((entry: { text: string }) => entry.text)).toEqual(['data question']);
    expect(
      (
        await application.app.inject({
          url: '/api/tutor/messages?lessonId=nanochat-data&stepId=input',
        })
      ).statusCode,
    ).toBe(404);
    application.store.createRun({
      ...request,
      lessonId: 'nanochat-data',
      experimentId: 'data-trace',
    });
    for (let i = 0; i < 55; i++) application.store.createRun(request);
    expect(application.store.listRuns('nanochat-data', '1.0.0')).toHaveLength(1);
    expect(application.store.listRuns('nanochat-forward', '1.0.0')).toHaveLength(50);
  });
  it('isolates course progress, run history and assessment evidence', async () => {
    const application = await create();
    const auth = await headers(application);
    const second = { ...request, lessonId: 'nanochat-data', experimentId: 'data-trace' };
    const query = '?lessonId=nanochat-data&lessonVersion=1.0.0';
    expect((await application.app.inject({ url: '/api/lessons' })).json()).toHaveLength(2);
    expect(
      (await application.app.inject({ url: '/api/catalog' + query })).json().lesson.steps,
    ).toHaveLength(3);
    expect(
      (await application.app.inject({ url: '/api/catalog?lessonId=missing' })).statusCode,
    ).toBe(404);
    expect(
      (
        await application.app.inject({
          url: '/api/catalog?lessonId=nanochat-data&lessonVersion=9.0.0',
        })
      ).statusCode,
    ).toBe(404);
    const invalid = await application.app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: auth,
      payload: { ...second, experimentId: 'forward-trace' },
    });
    expect(invalid.statusCode).toBe(400);
    const response = await application.app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: auth,
      payload: second,
    });
    expect(response.statusCode).toBe(201);
    const runId = response.json().id;
    await expect.poll(() => application.store.getRun(runId)?.status).toBe('succeeded');
    expect((await application.app.inject({ url: '/api/runs' })).json()).toHaveLength(0);
    expect((await application.app.inject({ url: '/api/runs' + query })).json()).toHaveLength(1);
    const reject = await application.app.inject({
      method: 'POST',
      url: '/api/assessments',
      headers: auth,
      payload: {
        lessonId: request.lessonId,
        lessonVersion: request.lessonVersion,
        stepId: 'input',
        answer: '(2, 8)',
        runId,
      },
    });
    expect(reject.statusCode).toBe(400);
    const accepted = await application.app.inject({
      method: 'POST',
      url: '/api/assessments',
      headers: auth,
      payload: {
        lessonId: second.lessonId,
        lessonVersion: second.lessonVersion,
        stepId: 'batch',
        answer: '(2, 9)',
        runId,
      },
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json().attempt.objectivePassed).toBe(true);
    expect((await application.app.inject({ url: '/api/progress' })).json().steps).toHaveLength(0);
    expect(
      (await application.app.inject({ url: '/api/progress' + query })).json().steps[0].status,
    ).toBe('verified');
  });
  it('accepts optional reflection and rejects evidence from a different sequence length', async () => {
    const application = await create();
    const auth = await headers(application);
    const response = await application.app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: auth,
      payload: { ...request, sequenceLength: 16 },
    });
    const runId = response.json().id;
    await expect.poll(() => application.store.getRun(runId)?.status).toBe('succeeded');
    const payload = {
      lessonId: request.lessonId,
      lessonVersion: request.lessonVersion,
      stepId: 'input',
      answer: '(2, 8)',
    };
    const rejected = await application.app.inject({
      method: 'POST',
      url: '/api/assessments',
      headers: auth,
      payload: { ...payload, runId },
    });
    expect(rejected.statusCode).toBe(400);
    expect(rejected.json().message).toContain('T=8');
    const accepted = await application.app.inject({
      method: 'POST',
      url: '/api/assessments',
      headers: auth,
      payload,
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json().attempt.explanationStatus).toBe('not_provided');
    expect(
      application.store.listAttempts(request.lessonId, request.lessonVersion)[0].explanationStatus,
    ).toBe('not_provided');
  });
  it('rejects foreign origins, DNS rebinding hosts, missing tokens, and traversal', async () => {
    const { app } = await create();
    expect(
      (await app.inject({ url: '/api/catalog', headers: { origin: 'https://evil.example' } }))
        .statusCode,
    ).toBe(403);
    expect(
      (await app.inject({ url: '/api/catalog', headers: { host: 'evil.example:4310' } }))
        .statusCode,
    ).toBe(403);
    expect(
      (await app.inject({ method: 'POST', url: '/api/runs', payload: request })).statusCode,
    ).toBe(403);
    expect((await app.inject({ url: '/api/source?file=../../.env' })).statusCode).toBe(404);
  });
  it('validates run input, persists results, and distinguishes explanation review from objective grading', async () => {
    const application = await create();
    const auth = await headers(application);
    const invalid = await application.app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: auth,
      payload: { ...request, command: 'arbitrary' },
    });
    expect(invalid.statusCode).toBe(400);
    const response = await application.app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: auth,
      payload: request,
    });
    expect(response.statusCode).toBe(201);
    const runId = response.json().id;
    await expect.poll(() => application.store.getRun(runId)?.status).toBe('succeeded');
    const assessed = await application.app.inject({
      method: 'POST',
      url: '/api/assessments',
      headers: auth,
      payload: {
        lessonId: request.lessonId,
        lessonVersion: request.lessonVersion,
        stepId: 'input',
        answer: '(2, 8)',
        explanation: '批次包含两条序列，每条序列包含八个整数索引。',
        runId,
      },
    });
    expect(assessed.json().attempt.objectivePassed).toBe(true);
    expect(assessed.json().attempt.explanationStatus).toBe('recorded');
    expect(application.store.getProgress(request.lessonId, request.lessonVersion)[0].status).toBe(
      'verified',
    );
    const downgrade = await application.app.inject({
      method: 'POST',
      url: '/api/progress',
      headers: auth,
      payload: {
        lessonId: request.lessonId,
        lessonVersion: request.lessonVersion,
        stepId: 'input',
      },
    });
    expect(downgrade.statusCode).toBe(200);
    expect(application.store.getProgress(request.lessonId, request.lessonVersion)[0].status).toBe(
      'verified',
    );
  });
  it('does not claim verified mastery without a successful run', async () => {
    const application = await create();
    const auth = await headers(application);
    await application.app.inject({
      method: 'POST',
      url: '/api/assessments',
      headers: auth,
      payload: {
        lessonId: request.lessonId,
        lessonVersion: request.lessonVersion,
        stepId: 'input',
        answer: '(2, 8)',
        explanation: '批次是两条序列，序列轴包含八个整数索引。',
      },
    });
    expect(application.store.getProgress(request.lessonId, request.lessonVersion)[0].status).toBe(
      'practiced',
    );
  });
  it('retains facts and marks unfinished work interrupted after reopening the database', () => {
    const directory = mkdtempSync(resolve(tmpdir(), 'llm-persistence-'));
    const path = resolve(directory, 'test.db');
    const first = new Store(path);
    first.setProgress(request.lessonId, request.lessonVersion, 'input', 'viewed');
    const run = first.createRun(request);
    first.updateRun(run.id, 'running');
    first.close();
    const second = new Store(path);
    expect(second.getRun(run.id)?.status).toBe('interrupted');
    expect(second.getProgress(request.lessonId, request.lessonVersion)[0].stepId).toBe('input');
    second.close();
  });
  it('keeps reading and assessment available with no Tutor key', async () => {
    const application = await create();
    expect((await application.app.inject({ url: '/api/catalog' })).statusCode).toBe(200);
    const previous = process.env.TUTOR_API_KEY;
    delete process.env.TUTOR_API_KEY;
    const response = await application.app.inject({
      method: 'POST',
      url: '/api/tutor',
      headers: await headers(application),
      payload: {
        lessonId: request.lessonId,
        lessonVersion: request.lessonVersion,
        stepId: 'input',
        message: '解释 shape',
        mode: 'explain',
      },
    });
    if (previous) process.env.TUTOR_API_KEY = previous;
    expect(response.statusCode).toBe(503);
    expect(response.json().message).toContain('固定教材与实验');
  });
});

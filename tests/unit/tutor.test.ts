import { afterEach, expect, it, vi } from 'vitest';
import { streamCompletion, tutorContext, verifyTutorCitations } from '../../apps/api/src/tutor.js';
import { loadContent } from '../../apps/api/src/content.js';
import { findRoot } from '../../apps/api/src/paths.js';

afterEach(() => vi.unstubAllGlobals());
it('builds exact-version context and separates hints from solutions', () => {
  const root = findRoot();
  const catalog = loadContent(root);
  const context = tutorContext(root, catalog, catalog.lesson.steps[0], 'hint');
  expect(context).toContain(catalog.lesson.commit);
  expect(context).toContain('B, T = idx.size()');
  expect(context).toContain('不直接给选择题答案');
  expect(context).not.toContain('TUTOR_API_KEY');
});
it('rejects fabricated citation IDs', () => {
  expect(verifyTutorCitations('说明 [source:real] [source:invented]', ['real'])).toBe(
    '说明 [source:real] [未核验引用]',
  );
});
it('parses streaming provider responses across chunk boundaries', async () => {
  const encoder = new TextEncoder();
  vi.stubGlobal(
    'fetch',
    vi.fn(
      async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                encoder.encode('data: {"choices":[{"delta":{"content":"形状"}}]}\n'),
              );
              controller.enqueue(
                encoder.encode(
                  '\ndata: {"choices":[{"delta":{"content":"不变"}}]}\n\ndata: [DONE]\n\n',
                ),
              );
              controller.close();
            },
          }),
          { headers: { 'Content-Type': 'text/event-stream' } },
        ),
    ),
  );
  const chunks: string[] = [];
  expect(
    await streamCompletion([], (text) => chunks.push(text), new AbortController().signal),
  ).toBe('形状不变');
  expect(chunks).toEqual(['形状', '不变']);
});
it('reports provider rate limits without exposing response secrets', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('secret provider body', { status: 429 })),
  );
  await expect(streamCompletion([], () => {}, new AbortController().signal)).rejects.toThrow(
    '限流',
  );
});

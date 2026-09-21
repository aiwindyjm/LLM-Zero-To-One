import { describe, expect, it } from 'vitest';
import {
  validateContent,
  validateLibrary,
  readSource,
  loadManifest,
} from '../../apps/api/src/content.js';
import { findRoot } from '../../apps/api/src/paths.js';
import { experimentRequestSchema } from '@llm/contracts';

describe('trusted curriculum', () => {
  it('validates every registered course and its independent experiment', () => {
    const catalogs = validateLibrary(findRoot());
    expect(catalogs.map((catalog) => catalog.experiment.id)).toEqual([
      'forward-trace',
      'data-trace',
    ]);
    expect(catalogs[1].lesson.steps.map((step) => step.id)).toEqual([
      'tokenize',
      'batch',
      'targets',
    ]);
  });
  it('resolves all graph edges, prerequisites, source ranges and checksums', () => {
    const catalog = validateContent(findRoot());
    expect(catalog.lesson.steps).toHaveLength(5);
    expect(catalog.graph.nodes.some((node) => node.kind === 'method')).toBe(true);
    expect(
      catalog.graph.edges
        .filter((edge) => edge.kind === 'calls')
        .every((edge) => edge.evidenceCodeId),
    ).toBe(true);
  });
  it('serves the real original commit patch and prevents arbitrary file reads', () => {
    const manifest = loadManifest(findRoot());
    expect(manifest.changes.find((file) => file.filename === 'nanochat/gpt.py')?.patch).toContain(
      '@@',
    );
    expect(() => readSource(findRoot(), '../../.env')).toThrow();
  });
  it('rejects arbitrary execution inputs and unsupported configurations', () => {
    expect(
      experimentRequestSchema.safeParse({
        lessonId: 'nanochat-forward',
        lessonVersion: '1.0.0',
        experimentId: 'forward-trace',
        preset: 'cpu',
        sequenceLength: 8,
        command: 'whoami',
      }).success,
    ).toBe(false);
    expect(
      experimentRequestSchema.safeParse({
        lessonId: 'nanochat-forward',
        lessonVersion: '1.0.0',
        experimentId: 'forward-trace',
        preset: 'cpu',
        sequenceLength: 999,
      }).success,
    ).toBe(false);
  });
});

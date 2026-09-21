import { expect, it } from 'vitest';
import { isConventional, releaseImpact } from '../../scripts/release-policy.js';

it('treats new lessons and factual corrections as product changes', () => {
  expect(releaseImpact(['feat(content): introduce the first lesson'])).toBe('minor');
  expect(releaseImpact(['fix(content): correct tensor shape'])).toBe('patch');
  expect(releaseImpact(['docs: fix contribution link', 'test: cover cancellation'])).toBe('none');
  expect(releaseImpact(['feat(api)!: change persistence format'])).toBe('minor');
});
it('rejects unclassified commit messages', () => {
  expect(isConventional('more updates')).toBe(false);
  expect(isConventional('feat(platform): add source workspace')).toBe(true);
});

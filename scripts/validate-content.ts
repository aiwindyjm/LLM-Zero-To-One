import { validateContent } from '../apps/api/src/content.js';
import { findRoot } from '../apps/api/src/paths.js';

const catalog = validateContent(findRoot());
console.log(
  `Verified ${catalog.lesson.steps.length} steps, ${catalog.graph.nodes.length} graph nodes, and pinned source checksums.`,
);

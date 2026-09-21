import { validateLibrary } from '../apps/api/src/content.js';
import { findRoot } from '../apps/api/src/paths.js';

const catalogs = validateLibrary(findRoot());
for (const catalog of catalogs)
  console.log(
    `Verified ${catalog.lesson.steps.length} steps, ${catalog.graph.nodes.length} graph nodes, and pinned source checksums.`,
  );

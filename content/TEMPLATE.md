# Lesson authoring template / 课程模板

1. **Identity**: stable lesson ID, content version, title, audience, estimated learning time.
2. **Objective**: what the learner can independently explain or change after this step.
3. **Prerequisites**: prior step IDs; explain why they matter.
4. **Source**: repository URL, full SHA, file path, symbol, inclusive line range, checksum manifest.
5. **Explanation**: problem, input, output, transformations, context, explicit implementation-specific details.
6. **Knowledge and sources**: stable IDs, original URLs, relevance, source type and verification date.
7. **Graph**: authored nodes/typed edges, minimum-loop membership, source evidence for calls.
8. **Experiment**: fixed preset, data origin, environment, resource budget, expected observations, failure interpretation.
9. **Assessment**: predict before running; objective checks; open explanation rubric; distinguish recorded from verified understanding.
10. **Review**: `pnpm content:check`, actual experiment output, licenses and PR release impact.

Do not invent commit history or claim an unexecuted result. Store answers on the server side, not in the public catalog response. The first release is a single active lesson; activating a second lesson requires the registration/API work described in the contribution guide.

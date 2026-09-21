# Interactive textbook design

The accepted direction follows familiar JupyterLab workspace organization, Transformer Explainer's manipulable explanations, and Distill's adjacent diagrams and prose. The intended learner writes Python but has not learned tensor axes. There is no welcome dashboard between opening the app and learning.

## Register and layout

- Quiet energy: focus on one computation; motion only communicates a state change.
- Precise finish: stable code line numbers, aligned grids and explicit labels support source checking.
- Moderate workbench density: the question, diagram and source fit in a 1366×768 first screen; references and long explanations disclose on demand.
- Light visual weight: 16px body, 14px code, compact toolbar, small radii, no nested promotional cards.
- Exploratory tone: clickable IDs and optional predictions invite experimentation without implying mastery from clicks.

The left column (220px) shows current chapter and five steps; future chapters collapse. The center shows the learning action; full source and graph are auxiliary views. The right column (300px) opens the selected concept and folds sources. Both sidebars resize/collapse and become keyboard-dismissible drawers on narrow screens.

## Tokens and behavior

Canonical tokens live in `apps/web/src/styles.css`. Light surfaces are `#ffffff`/`#f4f5f6`, body `#262b32`, muted text `#626b77`, action `#315d83`. Dark surfaces are `#27292c`/`#2e3135`, body `#e5e7e9`, action `#96bddf`. Axes B/T/C/V have stable colors and visible names; color alone never identifies an axis or selected token.

Local Chiron Hei HK and JetBrains Mono ship with OFL notices. Lucide icons use consistent strokes. Focus outlines, disabled controls, pending runs, errors, stopped runs, successful results and legacy records are explicit. Motion respects `prefers-reduced-motion`.

Diagram selections, current step, source and experiment persist across auxiliary views. Ordinary scrolling never changes other columns. Experiments expand in the center. Formal shape questions use explicit B=2/T=8 evidence; explanations remain optional. The last step opens a recap.

## Evidence and audit

Authored `content/` anchors drive diagram/source/concept linking. Illustrated values are symbols; bounded real samples are labelled replay. Unsampled positions show no fabricated vectors. Candidate labels are synthetic IDs, never invented words. Source details retain full SHA, diff and license.

Browser acceptance covers desktop first-screen source visibility, five diagrams, keyboard navigation, narrow drawers, theme persistence, graph navigation and legacy results. Actual Docker CPU browser replay was additionally inspected. Screenshots are validation artifacts, not model-training evidence.

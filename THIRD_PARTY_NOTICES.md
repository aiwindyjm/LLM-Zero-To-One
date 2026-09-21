# Third-party materials

## nanochat

- Repository: https://github.com/karpathy/nanochat
- Commit: `92d63d4e8bb4df75c3b71618f31ddde2378b2bcd`
- License: MIT; original license retained at `data/upstream/nanochat/LICENSE`.
- Unmodified source snapshots: `nanochat/gpt.py`, `nanochat/common.py`, `nanochat/optim.py`, `nanochat/flash_attention.py` beneath `data/upstream/nanochat/`.
- SHA-256 checksums and the original parent commit/diff metadata are stored in `data/upstream/manifest.json`.
- Source files retain original notices, including optimizer attribution to modded-nanogpt.

The snapshots remain separate from original educational content. This project is independent and is not endorsed by nanochat's authors.

## UI primitives

Button and dialog components follow the MIT-licensed shadcn/ui patterns, built on Radix UI. Sources: https://github.com/shadcn-ui/ui and https://github.com/radix-ui/primitives. The dependency lock records exact installed packages. React Flow's attribution remains visible.

shadcn/ui notice: Copyright (c) 2023 shadcn. Permission is granted under the MIT License to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies, provided the copyright and permission notices are retained. The software is provided "AS IS", without warranty of any kind. Full license: https://github.com/shadcn-ui/ui/blob/main/LICENSE.md.

## Papers and documentation

## Bundled fonts

Chiron Hei HK by Tamcy (2023–2026), based on Adobe Source Han Sans (2014–2025), is distributed through `chiron-hei-hk-webfont-truetype` 2.6.9 (the emfont webfont package). JetBrains Mono is distributed through `@fontsource/jetbrains-mono` 5.2.8. Both use SIL OFL 1.1; font licensing is independent of the program MIT license. Local font subsets are served by the application, without a runtime font CDN.

The original notices and full licenses ship in `apps/web/public/fonts/licenses/` and the built `/fonts/licenses/` directory. Sources: https://github.com/chiron-fonts/chiron-hei-hk/blob/main/LICENSE.md and https://github.com/JetBrains/JetBrainsMono/blob/master/OFL.txt.

The platform links to original PyTorch documentation and the Transformer paper. It does not redistribute entire papers or third-party documentation. Source metadata records why each resource is relevant; original authors retain their rights.

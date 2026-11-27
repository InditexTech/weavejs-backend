## Why

The SDK is adding brush pens (weavejs#1312) and a stroke eraser that splits strokes into many pieces (weavejs#1313). The backend renders rooms server-side (PNG, PDF, presentation) on two canvas backends (skia, node-canvas), and nothing verifies that the new stroke looks render with ink, or what thousands of split strokes cost in room size and export time. See InditexTech/weavejs-backend#193.

## What Changes

- Add a `check:strokes` smoke script modelled on `check:text`: stroke fixtures rendered through `renderWeaveRoom` and `exportNodesServerSide` on both backends, failing on missing ink, dumping PNGs to `temp/` for diffing across SDK versions.
- Add a `node:test` test exporting a room made of split stroke pieces.
- Measure room state size and PNG/PDF/presentation export time for ~5,000 stroke nodes, before and after simulated erasing, and record thresholds in a doc.
- Phase A (stroke fixtures, test, benchmark baseline) and Phase B (pens: flat ends, multiply, tapers, variance; multiply parity; deterministic variance) run against the local weavejs branch build; the real SDK bump to 5.11.0 follows its release.
- Phase B (after SDK bump delivering #1312/#1313): pen fixtures (flat ends, multiply, tapers, variance), skia vs node-canvas multiply parity, deterministic variance check.
- No API, endpoint or data-contract change; no production code change.

## Capabilities

### New Capabilities
- `stroke-export-rendering`: server-side export of stroke nodes (pens, split pieces) renders visible ink consistently on both canvas backends and stays within recorded cost thresholds.

### Modified Capabilities

## Impact

- New: `code/src/utils/stroke-render-check.ts`, a `*.test.ts` next to it, a thresholds doc, `package.json` scripts (`check:strokes`).
- Verification uses a local weavejs build (not committed); the dependency bump to 5.11.0 happens after release.

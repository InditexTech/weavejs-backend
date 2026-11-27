# Tasks

## 1. Stroke render check (SDK 5.9.0)

- [x] 1.1 Create `code/src/utils/stroke-render-check.ts` modelled on `text-render-check.ts` with legacy and pre-split stroke fixtures; verify `WEAVE_CANVAS_BACKEND=skia tsx src/utils/stroke-render-check.ts` exits 0 and writes PNGs and metrics to `temp/stroke-render-check/skia/`
- [x] 1.2 Add `check:strokes` to `code/package.json` running skia then canvas; verify `npm run check:strokes` passes on both and a deliberately blank fixture makes it exit non-zero
- [x] 1.3 Add a `node:test` file exporting a room of split stroke pieces through `exportNodesServerSide`; verify `npm test` passes and covers ink present

## 2. Cost benchmark

- [x] 2.1 Measure room state size and PNG/PDF/presentation export time for ~5,000 stroke nodes, intact and split, on both backends; verify the results are recorded in the cost doc
- [x] 2.2 Record measured values and thresholds in `code/docs/stroke-export-cost.md`; verify the doc lists numbers for before and after erasing and how they were measured

## 3. Local SDK build and pen checks

- [x] 3.1 Install the local weavejs branch build (`feature/GH-1313-add-stroke-eraser-tool-that`) into `code/node_modules/@inditextech/weave-*` via packed tarballs without touching `package.json` or the lockfile; verify `git status` shows no dependency changes, `setInstrument` is present in `sdk.node.js`, and the commit hash plus dirty flag are recorded
- [x] 3.2 Add fixtures per pen: flat ends, multiply, tapers, variance; verify `check:strokes` passes on both backends
- [x] 3.3 Add multiply parity check between skia and node-canvas with a documented tolerance; verify it passes and fails when one backend ignores multiply
- [x] 3.4 Add deterministic variance check (same stroke id, both backends); verify identical width profile within tolerance
- [x] 3.5 Measure on the local build and record provisional thresholds tagged with the SDK commit and dirty flag; verify the doc marks them provisional until re-measured on 5.11.0

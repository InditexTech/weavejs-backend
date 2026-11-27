<!--
SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)

SPDX-License-Identifier: Apache-2.0
-->

# Stroke export cost

Cost of exporting rooms with many stroke nodes, before and after erasing, on
both canvas backends. Tracks InditexTech/weavejs-backend#193.

> **Provisional.** Measured against a local build of weavejs branch
> `feature/GH-1313-add-stroke-eraser-tool-that` (SDK `5.11.0-SNAPSHOT`, commit
> `fd0974c03`, **dirty**: the stroke eraser was not committed yet). Re-measure
> with the released weavejs 5.11.0 and replace these numbers.

## How it was measured

A one-off script (not kept in the repo) built the rooms and timed the exports
through `renderWeaveRoom`, `exportNodesServerSide`, `exportAreaServerSide`,
`sharp` and `pdf-lib`, as the export jobs do. Re-measure the same way when
weavejs 5.11.0 ships.

The room holds `STROKES` short strokes on a 70-column grid. "Erased" splits every
~3rd stroke into 3 pieces (what the stroke eraser produces: ordinary stroke
nodes), giving 8,334 nodes. The export covers the whole board (about
4200 x 2900 px, pixel ratio 1). The presentation export is a 1920 x 1080 JPEG
area, as the presentation job does.

## Measured (one run, Apple dev machine, after a warm-up)

| Backend | Room | Nodes | State | Load | PNG | PDF | Presentation |
|---|---|---|---|---|---|---|---|
| skia | intact | 5,000 | 5.6 MiB | 0.7 s | 6.0 s | 7.5 s | 1.7 s |
| skia | erased | 8,334 | 6.2 MiB | 1.0 s | 9.6 s | 21.4 s | 2.7 s |
| canvas | intact | 5,000 | 5.6 MiB | 2.2 s | 6.8 s | 7.0 s | 1.4 s |
| canvas | erased | 8,334 | 6.2 MiB | 1.0 s | 10.0 s | 10.0 s | 0.8 s |

Observations:

- Room state is about 1.1 KiB per stroke node; splitting 30% of strokes into
  3 pieces grew the state by about 12%.
- PNG/PDF export time grows roughly with node count (about +60% for +67% nodes).
- The skia PDF "erased" run (21.4 s) is an outlier against its PNG time
  (9.6 s) and the canvas run (10.0 s); repeat it before relying on it.
- Resident memory stayed under about 650 MiB.

## Provisional thresholds

Indicative limits, with roughly 2x headroom over the measured values, for a
board with up to about 10,000 stroke nodes:

| Metric | Threshold |
|---|---|
| Room state (Yjs update) | 15 MiB |
| PNG export, whole board | 20 s |
| PDF export, one frame | 25 s |
| Presentation image (1920 x 1080) | 6 s |
| Resident memory during export | 1 GiB |

Exceeding a threshold is a signal to investigate (for example, by culling
strokes outside the export area), not a hard failure. Timings depend on the
machine.

## Related finding: variance on node exports

`exportNodesServerSide` cloned nodes with a new id, and stroke width variance is
seeded from the stroke id, so the same stroke came out with different widths on
every export (and differed from the canvas). `exportAreaServerSide` kept the id
and was unaffected. Fixed in weavejs by having export clones carry
`exportSourceId`, which the stroke seed uses. `npm run check:strokes` covers it;
it needs an SDK build that includes the fix (weavejs 5.11.0 once released).

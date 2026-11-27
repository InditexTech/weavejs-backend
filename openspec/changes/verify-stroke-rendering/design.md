# Design

## Context

`code/src/utils/text-render-check.ts` builds a Yjs room from fixtures, calls `renderWeaveRoom`, exports each node via `exportNodesServerSide`, composites with `sharp`, and checks ink. `check:text` runs it with `WEAVE_CANVAS_BACKEND=skia` then `canvas`. `weave.ts` already registers `WeaveStrokeNode` and `WeaveStrokeSingleNode`. Tests are `src/**/*.test.ts` run by `tsx --test`. Installed SDK 5.9.0 lacks pens and the stroke eraser; pieces from erasing are ordinary stroke nodes. See proposal.md.

## Goals / Non-Goals

**Goals:**
- Reuse the `check:text` structure for strokes; share helpers (Yjs build, ink scan) rather than copy where cheap.
- Land a pre-pens baseline now, pen checks after the SDK bump.

**Non-Goals:**
- No change to endpoints, export code or stroke data.
- No pixel-exact golden comparison against the browser client.

## Decisions

- **Local SDK build.** Verification runs against the local weavejs branch (pens merged, eraser in progress), installed into `node_modules` from packed tarballs of every `@inditextech/weave-*` package. `package.json` and the lockfile stay on 5.9.0. Alternative: `npm link`; rejected as default because symlinks can resolve duplicate `konva`/`yjs`/`canvas`. After weavejs 5.11.0 ships, bump the dependency and re-run both scripts. Results record the SDK commit and a dirty flag and are provisional until then.
- **Phase split.** Phase A uses legacy stroke props and synthetic split pieces; Phase B fixtures are guarded so the script still runs on 5.9.0. Alternative: wait for the SDK; rejected, loses a baseline.
- **Split simulation.** Cut each fixture stroke's points into 2-3 pieces keeping id suffixes, look and width, as #1313 specifies. Alternative: invoke the real eraser; unavailable server-side.
- **Variance check.** Compare skia vs node-canvas renders of the same seeded stroke (numeric/ink-profile tolerance), not client goldens. Client goldens are a follow-up if a reference is supplied.
- **Benchmark is a one-off.** The cost numbers were measured with a throwaway script and recorded in `code/docs/stroke-export-cost.md`; no benchmark script is kept in the repo. Re-measure on the 5.11.0 release.
- **Multiply parity** compares overlap pixels with a tolerance, since backends differ slightly in antialiasing.

## Risks / Trade-offs

- [SDK pen API shape changes before release] -> keep pen fixtures isolated in one block, adjust on bump.
- [Benchmark time and memory with 5,000 nodes] -> run locally, cap pixel ratio, report per-format timings.
- [Tolerance choices are arbitrary] -> record chosen values and their rationale in the doc.
- [Timings are machine dependent] -> thresholds expressed with headroom and noted as indicative.

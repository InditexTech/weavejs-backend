// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Smoke check for server-side rendering of stroke nodes (weavejs-backend#193).
 *
 * Renders fixture rooms through `renderWeaveRoom` on the backend selected by
 * WEAVE_CANVAS_BACKEND (skia | canvas), exports one PNG per fixture and dumps
 * ink metrics to `temp/stroke-render-check/<backend>/` so runs can be diffed
 * across SDK versions. Exits non-zero if a fixture exports without ink.
 *
 * Usage: WEAVE_CANVAS_BACKEND=skia tsx src/utils/stroke-render-check.ts
 * Set STROKE_CHECK_BLANK=1 to add a deliberately blank fixture (self-test).
 */
import fs from "node:fs";
import path from "node:path";
import {
  buildStrokeRoom,
  columnProfile,
  exportAreaPng,
  exportPng,
  hasPens,
  inkStats,
  makeStroke,
  penLook,
  penStrokes,
  pixelAt,
  renderRoom,
  splitStroke,
  wavePoints,
  type StrokeSpec,
} from "./stroke-fixtures.ts";

const backend =
  process.env.WEAVE_CANVAS_BACKEND === "canvas" ? "canvas" : "skia";
const outDir = path.resolve(process.cwd(), "temp/stroke-render-check", backend);

const splitBase = makeStroke("split-base", {
  strokeWidth: 10,
  stroke: "#1565c0ff",
});

const fixtures: StrokeSpec[] = [
  makeStroke("legacy-plain"),
  makeStroke("legacy-thick", { strokeWidth: 24, stroke: "#c62828ff" }),
  makeStroke("legacy-pressure", {
    strokeWidth: 16,
    points: wavePoints(40, 300, 40, (t) => 0.2 + 0.8 * Math.sin(t * Math.PI)),
  }),
  makeStroke("legacy-dashed", { dash: [12, 10] }),
  makeStroke("legacy-single-point", {
    points: [{ x: 10, y: 10, pressure: 1 }],
    strokeWidth: 20,
  }),
  // pieces of one erased stroke: ordinary stroke nodes sharing look and width
  ...splitStroke(splitBase, 3),
];

if (hasPens()) {
  const pens = penStrokes();
  const brush = pens.find((p) => p.id === "pen-brush");
  fixtures.push(...pens);
  // pre-split pen stroke: pieces keep the look, cut ends lose their taper
  if (brush) fixtures.push(...splitStroke(brush, 3).slice(1));
} else {
  console.warn(`[${backend}] SDK has no brush pens: pen fixtures skipped`);
}

if (process.env.STROKE_CHECK_BLANK) {
  fixtures.push(
    makeStroke("blank-self-test", { stroke: "#ffffffff", strokeWidth: 8 }),
  );
}

const line = (
  id: string,
  from: [number, number],
  to: [number, number],
  props: Record<string, unknown>,
) =>
  makeStroke(id, {
    strokeWidth: 30,
    points: [
      { x: from[0], y: from[1], pressure: 1 },
      { x: to[0], y: to[1], pressure: 1 },
    ],
    ...props,
  });

/**
 * A multiply stroke over an opaque one must darken the overlap: with source-over
 * the overlap would stay close to the yellow. Samples are saved for the
 * cross-backend parity check.
 */
const checkMultiply = async (failures: string[]) => {
  const blue = line("mul-base", [0, 15], [200, 15], {
    x: 20,
    y: 100,
    stroke: "#1565c0ff",
  });
  const yellow = line("mul-top", [15, 0], [15, 200], {
    x: 100,
    y: 20,
    stroke: "#ffeb3bff",
    opacity: 0.75,
    globalCompositeOperation: "multiply",
  });
  const { instance, destroy } = await renderRoom(
    buildStrokeRoom([blue, yellow]),
  );
  const png = await exportPng(instance, ["mul-base", "mul-top"]);
  await destroy();
  fs.writeFileSync(path.join(outDir, "multiply-overlap.png"), png);
  // export origin is the top-left of the nodes (20, 20) plus the padding (10)
  const at = (x: number, y: number) => pixelAt(png, x - 20 + 10, y - 20 + 10);
  const sample = {
    overlap: await at(115, 115),
    yellowOnly: await at(115, 50),
    blueOnly: await at(50, 115),
  };
  if (sample.overlap[0] >= 100) {
    failures.push(
      `multiply: overlap ${sample.overlap} is not darkened (source-over?)`,
    );
  }
  return sample;
};

/**
 * The width variation is seeded from the stroke id: the same stroke must export
 * the same profile every time and another id must give another one. Checked on
 * both server exports: `exportNodesServerSide` (nodes) and
 * `exportAreaServerSide` (area).
 */
const checkVariance = async (failures: string[]) => {
  const look = penLook({
    outline: "round",
    curve: "centripetal",
    pressureInterp: "linear",
    zoomAware: true,
    variance: 0.8,
    width: { min: 0.4, max: 1 },
  });
  const points = wavePoints(60, 300, 10);
  const a = makeStroke("var-a", { strokeWidth: 14, points, look });
  const b = makeStroke("var-b", { strokeWidth: 14, points, look, y: 200 });
  const { instance, destroy } = await renderRoom(buildStrokeRoom([a, b]));
  const nodes = (id: string) =>
    exportPng(instance, [id]).then((png) => columnProfile(png));
  const area = (y: number) =>
    exportAreaPng(instance, { x: 10, y, width: 340, height: 60 }).then((png) =>
      columnProfile(png),
    );
  const result = {
    nodes: { first: await nodes("var-a"), again: await nodes("var-a") },
    area: { first: await area(10), again: await area(10) },
    areaOtherId: await area(190),
  };
  await destroy();
  const same = (x: number[], y: number[]) =>
    JSON.stringify(x) === JSON.stringify(y);
  if (!same(result.nodes.first, result.nodes.again)) {
    failures.push(
      "variance: exportNodesServerSide draws one stroke with different widths on every export (clones get a new id, so the id seed changes)",
    );
  }
  if (!same(result.area.first, result.area.again)) {
    failures.push("variance: exportAreaServerSide is not deterministic");
  }
  if (same(result.area.first, result.areaOtherId)) {
    failures.push("variance: different stroke ids share one width profile");
  }
  return result;
};

const main = async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const stacked = fixtures.map((f, i) => ({
    ...f,
    props: { ...f.props, y: 20 + i * 160 },
  }));
  const { instance, destroy } = await renderRoom(buildStrokeRoom(stacked));
  const stage = instance.getStage();
  const failures: string[] = [];
  const metrics: Record<string, unknown> = {};

  const checkFixture = async (f: StrokeSpec) => {
    const node = stage.findOne(`#${f.id}`);
    if (!node) {
      failures.push(`${f.id}: node not found`);
      return;
    }
    try {
      const png = await exportPng(instance, [f.id]);
      fs.writeFileSync(path.join(outDir, `${f.id}.png`), png);
      const stats = await inkStats(png);
      metrics[f.id] = { className: node.getClassName(), ...stats };
      if (stats.ink === 0) failures.push(`${f.id}: rendered image has no ink`);
    } catch (e) {
      failures.push(`${f.id}: export failed: ${(e as Error).message}`);
    }
  };

  for (const f of fixtures) {
    // exports share one stage and must run one at a time
    await checkFixture(f); // NOSONAR
  }

  await destroy();
  if (hasPens()) {
    metrics.multiply = await checkMultiply(failures);
    metrics.variance = await checkVariance(failures);
  }
  fs.writeFileSync(
    path.join(outDir, "metrics.json"),
    JSON.stringify(metrics, null, 2),
  );
  console.log(`[${backend}] metrics -> ${path.join(outDir, "metrics.json")}`);
  if (failures.length) {
    console.error(`[${backend}] FAILURES:\n  ${failures.join("\n  ")}`);
    process.exit(1);
  }
  console.log(`[${backend}] OK (${fixtures.length} fixtures)`);
  process.exit(0);
};

try {
  await main();
} catch (e) {
  console.error(e);
  process.exit(1);
}

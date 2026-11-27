// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Compares the output of `stroke-render-check.ts` on the skia and node-canvas
 * backends (weavejs-backend#193): same ink per fixture, same multiply result
 * and same seeded width profile, within tolerance. Run it after both backends:
 *
 *   WEAVE_CANVAS_BACKEND=skia tsx src/utils/stroke-render-check.ts
 *   WEAVE_CANVAS_BACKEND=canvas tsx src/utils/stroke-render-check.ts
 *   tsx src/utils/stroke-parity-check.ts
 */
import fs from "node:fs";
import path from "node:path";

/** Allowed relative difference in ink pixels per fixture. */
const INK_TOLERANCE = 0.1;
/** Allowed difference per colour channel of a blended pixel. */
const COLOR_TOLERANCE = 8;
/** Allowed relative difference of the seeded width profile (sum over buckets). */
const PROFILE_TOLERANCE = 0.05;

type Metrics = Record<string, Record<string, unknown>> & {
  multiply?: Record<string, number[]>;
  variance?: { area: { first: number[] } };
};

const read = (backend: string): Metrics =>
  JSON.parse(
    fs.readFileSync(
      path.resolve(
        process.cwd(),
        "temp/stroke-render-check",
        backend,
        "metrics.json",
      ),
      "utf8",
    ),
  );

const skia = read("skia");
const canvas = read("canvas");
const failures: string[] = [];

for (const id of Object.keys(skia)) {
  if (id === "multiply" || id === "variance") continue;
  const a = skia[id].ink as number;
  const b = (canvas[id]?.ink as number | undefined) ?? 0;
  if (Math.abs(a - b) > INK_TOLERANCE * Math.max(a, b, 1)) {
    failures.push(`${id}: ink differs (skia ${a}, canvas ${b})`);
  }
}

if (skia.multiply && canvas.multiply) {
  for (const [name, a] of Object.entries(skia.multiply)) {
    const b = canvas.multiply[name];
    if (a.some((v, i) => Math.abs(v - b[i]) > COLOR_TOLERANCE)) {
      failures.push(`multiply ${name}: skia ${a} vs canvas ${b}`);
    }
  }
}

if (skia.variance && canvas.variance) {
  const a = skia.variance.area.first;
  const b = canvas.variance.area.first;
  const diff = a.reduce((sum, v, i) => sum + Math.abs(v - b[i]), 0);
  const total = a.reduce((sum, v) => sum + v, 0);
  if (diff > PROFILE_TOLERANCE * total) {
    failures.push(
      `variance: width profile differs by ${((diff / total) * 100).toFixed(1)}%`,
    );
  }
}

if (failures.length) {
  console.error(`[parity] FAILURES:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`[parity] OK (${Object.keys(skia).length} entries)`);

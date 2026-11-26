// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Cost benchmark for rooms with many stroke nodes (weavejs-backend#193).
 *
 * Builds a room of N strokes (intact) and the same room after simulated
 * erasing (a ratio of the strokes split into pieces), then measures room state
 * size, room load time and PNG / PDF / presentation export time. Results go to
 * `temp/stroke-bench/<backend>/result.json` and are printed as a table.
 *
 * Usage: WEAVE_CANVAS_BACKEND=skia tsx src/utils/stroke-bench.ts
 *
 * Env: STROKES (5000), ERASED_RATIO (0.3), PARTS (3), POINTS (12),
 *      WEAVEJS_REPO (path of the SDK checkout, to record commit and dirty flag).
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import sharp from "sharp";
import {
  buildStrokeRoom,
  makeStroke,
  renderRoom,
  splitStroke,
  wavePoints,
  type StrokeSpec,
} from "./stroke-fixtures.ts";

const backend =
  process.env.WEAVE_CANVAS_BACKEND === "canvas" ? "canvas" : "skia";
const outDir = path.resolve(process.cwd(), "temp/stroke-bench", backend);

const STROKES = Number(process.env.STROKES ?? 5000);
const ERASED_RATIO = Number(process.env.ERASED_RATIO ?? 0.3);
const PARTS = Number(process.env.PARTS ?? 3);
const POINTS = Number(process.env.POINTS ?? 12);
const COLUMNS = 70;
const CELL_W = 60;
const CELL_H = 40;

const buildStrokes = (): StrokeSpec[] =>
  Array.from({ length: STROKES }, (_, i) => {
    const col = i % COLUMNS;
    const row = Math.floor(i / COLUMNS);
    return makeStroke(`s${i}`, {
      x: col * CELL_W,
      y: row * CELL_H,
      strokeWidth: 4,
      points: wavePoints(POINTS, CELL_W - 10, 12),
    });
  });

const eraseSome = (strokes: StrokeSpec[]): StrokeSpec[] => {
  const every = Math.max(1, Math.round(1 / ERASED_RATIO));
  return strokes.flatMap((s, i) =>
    i % every === 0 ? splitStroke(s, PARTS) : [s],
  );
};

const sdkInfo = () => {
  const version = (
    JSON.parse(
      fs.readFileSync(
        path.resolve(
          process.cwd(),
          "node_modules/@inditextech/weave-sdk/package.json",
        ),
        "utf8",
      ),
    ) as { version: string }
  ).version;
  const repo = process.env.WEAVEJS_REPO;
  if (!repo) return { version };
  const git = (...args: string[]) =>
    execFileSync("git", ["-C", repo, ...args])
      .toString()
      .trim();
  return {
    version,
    commit: git("rev-parse", "--short", "HEAD"),
    dirty: git("status", "--porcelain").length > 0,
  };
};

const time = async <T>(fn: () => Promise<T>): Promise<[T, number]> => {
  const t0 = performance.now();
  const value = await fn();
  return [value, Math.round(performance.now() - t0)];
};

const rssMb = () => Math.round(process.memoryUsage().rss / 1024 / 1024);

const measure = async (label: string, strokes: StrokeSpec[]) => {
  const room = buildStrokeRoom(strokes);
  const stateBytes = Buffer.from(room, "base64").length;
  const [rendered, loadMs] = await time(() => renderRoom(room));
  const { instance, destroy } = rendered;
  const ids = strokes.map((s) => s.id);
  const options = {
    padding: 10,
    pixelRatio: 1,
    backgroundColor: "#ffffff",
    quality: 1,
  };

  const [png, pngMs] = await time(async () => {
    const { composites, width, height } = await instance.exportNodesServerSide(
      ids,
      (n) => n,
      { format: "image/png" as never, ...options },
    );
    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(composites)
      .png()
      .toBuffer();
  });

  const [pdf, pdfMs] = await time(async () => {
    const { composites, width, height } = await instance.exportNodesServerSide(
      ids,
      (n) => n,
      { format: "image/png" as never, ...options },
    );
    const image = await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(composites)
      .png()
      .toBuffer();
    const doc = await PDFDocument.create();
    const page = doc.addPage([842, 595]);
    const embedded = await doc.embedPng(image);
    page.drawImage(embedded, { x: 40, y: 40, width: 400, height: 300 });
    return doc.save();
  });

  const [presentation, presentationMs] = await time(async () => {
    const { composites, width, height } = await instance.exportAreaServerSide(
      { x: 0, y: 0, width: 1920, height: 1080 },
      { format: "image/jpeg" as never, ...options },
    );
    return sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(composites)
      .jpeg({ quality: 100 })
      .toBuffer();
  });

  await destroy();
  const result = {
    label,
    nodes: strokes.length,
    stateBytes,
    stateBase64Bytes: room.length,
    loadMs,
    pngMs,
    pngBytes: png.length,
    pdfMs,
    pdfBytes: pdf.length,
    presentationMs,
    presentationBytes: presentation.length,
    rssMb: rssMb(),
  };
  console.log(`[${backend}] ${label}: ${JSON.stringify(result)}`);
  return result;
};

const main = async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const intact = buildStrokes();
  // warm-up: the first render pays one-off costs (fonts, native modules)
  await measure("warm-up", intact.slice(0, 50));
  const results = [
    await measure("intact", intact),
    await measure("erased", eraseSome(intact)),
  ];
  const output = {
    backend,
    sdk: sdkInfo(),
    params: { STROKES, ERASED_RATIO, PARTS, POINTS },
    results,
  };
  fs.writeFileSync(
    path.join(outDir, "result.json"),
    JSON.stringify(output, null, 2),
  );
  console.table(results);
  console.log(`[${backend}] result -> ${path.join(outDir, "result.json")}`);
  process.exit(0);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

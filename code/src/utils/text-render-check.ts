// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Smoke check for server-side rendering of text nodes (weavejs#1224).
 *
 * Renders fixture rooms through `renderWeaveRoom` on the backend selected by
 * WEAVE_CANVAS_BACKEND (skia | canvas), exports PNGs and dumps text metrics
 * to `temp/text-render-check/<backend>/` so runs can be diffed across SDK
 * versions. Exits non-zero if a node has empty size or fails to export.
 *
 * Usage: WEAVE_CANVAS_BACKEND=skia tsx src/utils/text-render-check.ts
 */
import fs from "node:fs";
import path from "node:path";
import * as Y from "yjs";
import sharp from "sharp";
import { renderWeaveRoom } from "../canvas/weave.ts";
import type { ServiceConfig } from "../types.ts";

const backend =
  process.env.WEAVE_CANVAS_BACKEND === "canvas" ? "canvas" : "skia";
const outDir = path.resolve(process.cwd(), "temp/text-render-check", backend);

const LOREM =
  "The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs.\nSecond paragraph after a hard break.";

type Fixture = {
  id: string;
  props: Record<string, unknown>;
  /** keep x/y from props instead of stacking fixtures vertically */
  keepPosition?: boolean;
  /** require ink in the first text line (export padding 10, font 32) */
  topInk?: boolean;
  /** require at least one pixel close to this colour (marks must render) */
  expectColor?: [number, number, number];
};

const base = {
  nodeType: "text",
  x: 20,
  y: 20,
  fontFamily: "Inter",
  fontSize: 20,
  fill: "#000000ff",
  lineHeight: 1.2,
  align: "left",
};

const fixtures: Fixture[] = [
  // legacy documents: `text` only, one per layout
  ...["smart", "auto-all", "auto-height", "fixed"].map((layout) => ({
    id: `legacy-${layout}`,
    props: { ...base, text: LOREM, layout, width: 300, height: 200 },
  })),
  {
    id: "legacy-arial",
    props: {
      ...base,
      fontFamily: "Arial",
      text: LOREM,
      layout: "auto-height",
      width: 300,
    },
  },
  {
    id: "legacy-mono",
    props: {
      ...base,
      fontFamily: "Roboto Mono",
      text: LOREM,
      layout: "auto-height",
      width: 300,
    },
  },
  {
    id: "legacy-bold-italic",
    props: {
      ...base,
      fontStyle: "bold italic",
      text: LOREM,
      layout: "auto-height",
      width: 300,
    },
  },
  {
    id: "legacy-letterspacing",
    props: {
      ...base,
      letterSpacing: 3,
      text: LOREM,
      layout: "auto-height",
      width: 300,
    },
  },
  {
    id: "legacy-link",
    props: {
      ...base,
      link: "https://example.com",
      text: "Link text",
      layout: "smart",
    },
  },
  // new model (provisional shape from the issue: blocks[] -> runs[{t, m}])
  {
    id: "blocks-plain",
    props: {
      ...base,
      layout: "auto-height",
      width: 300,
      text: LOREM,
      blocks: LOREM.split("\n").map((t) => ({ runs: [{ t, m: {} }] })),
    },
  },
  {
    id: "blocks-marks",
    props: {
      ...base,
      layout: "auto-height",
      width: 300,
      text: "Hello bold world",
      blocks: [
        {
          runs: [
            { t: "Hello ", m: {} },
            { t: "bold", m: { bold: true } },
            { t: " world", m: { link: "https://example.com" } },
          ],
        },
      ],
    },
  },
  // rich text (richText attribute on the node, as the frontend richTextTool)
  {
    id: "rich-marks",
    expectColor: [255, 0, 0],
    props: {
      ...base,
      richText: true,
      layout: "auto-height",
      width: 400,
      blocks: [
        {
          runs: [
            { t: "bold ", m: { bold: true } },
            { t: "italic ", m: { italic: true } },
            { t: "underline ", m: { underline: true } },
            { t: "strike ", m: { strike: true } },
            { t: "red ", m: { color: "#ff0000" } },
            { t: "big ", m: { size: 1.6 } },
            { t: "mono ", m: { family: "Roboto Mono" } },
            { t: "link", m: { link: "https://example.com" } },
          ],
        },
      ],
    },
  },
  {
    id: "rich-lists",
    props: {
      ...base,
      richText: true,
      layout: "auto-height",
      width: 400,
      blocks: [
        { kind: "ul", runs: [{ t: "bullet one" }] },
        { kind: "ul", depth: 1, runs: [{ t: "nested bullet" }] },
        { kind: "ol", start: 1, runs: [{ t: "first" }] },
        { kind: "ol", start: 2, runs: [{ t: "second" }] },
      ],
    },
  },
  {
    id: "rich-align",
    props: {
      ...base,
      richText: true,
      layout: "auto-height",
      width: 400,
      blocks: [
        { align: "left", runs: [{ t: "left" }] },
        { align: "center", runs: [{ t: "center" }] },
        { align: "right", runs: [{ t: "right" }] },
      ],
    },
  },
  // regression (weavejs#1231): node above/left of the stage viewport lost its
  // first lines on export. Real board data: `Inter, sans-serif`, no marks.
  {
    id: "board-negative-xy",
    keepPosition: true,
    topInk: true,
    props: {
      ...base,
      x: -1270.88,
      y: -122.79,
      fontFamily: "Inter, sans-serif",
      fontSize: 32,
      lineHeight: 1,
      layout: "smart",
      width: 1402.84,
      text: "first line must be visible, is this possible?\n\nsecond\nthird",
      blocks: [
        { runs: [{ t: "first line must be visible, is this possible?" }] },
        { runs: [] },
        { runs: [{ t: "second" }] },
        { runs: [{ t: "third" }] },
      ],
    },
  },
];

// documents carry `text` as a derived mirror of `blocks` (joined by \n); keep it
// first, as stored documents do.
const withMirror = (props: Record<string, unknown>) => {
  const blocks = props.blocks as { runs: { t: string }[] }[] | undefined;
  if (!blocks || typeof props.text === "string") return props;
  const text = blocks.map((b) => b.runs.map((r) => r.t).join("")).join("\n");
  return { text, ...props };
};

const toYjs = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    const arr = new Y.Array();
    arr.insert(0, value.map(toYjs));
    return arr;
  }
  if (value && typeof value === "object") {
    const map = new Y.Map();
    Object.entries(value).forEach(([k, v]) => map.set(k, toYjs(v)));
    return map;
  }
  return value;
};

const buildRoom = (): string => {
  const doc = new Y.Doc();
  const node = (id: string, type: string, props: Record<string, unknown>) => ({
    key: id,
    type,
    props: { id, nodeType: type, ...props },
  });
  const nodes = fixtures.map((f, i) =>
    node(
      f.id,
      "text",
      withMirror(f.keepPosition ? f.props : { ...f.props, y: 20 + i * 260 }),
    ),
  );
  const layer = (id: string, children: unknown[] = []) =>
    node(id, "layer", { children });
  const stage = node("stage", "stage", {
    children: [
      layer("gridLayer"),
      layer("mainLayer", nodes),
      layer("selectionLayer"),
      layer("usersPointersLayer"),
      layer("utilityLayer"),
    ],
  });
  doc.transact(() => {
    const weave = doc.getMap("weave");
    weave.set("key", "stage");
    weave.set("type", "stage");
    weave.set("props", toYjs(stage.props));
  });
  return Buffer.from(Y.encodeStateAsUpdate(doc)).toString("base64");
};

const main = async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const config = {
    service: { port: 0 },
    internalToken: "",
  } as unknown as ServiceConfig;

  const { instance, destroy } = await renderWeaveRoom(config, buildRoom());
  const stage = instance.getStage();
  const failures: string[] = [];
  const metrics: Record<string, unknown> = {};

  for (const f of fixtures) {
    const node = stage.findOne(`#${f.id}`);
    if (!node) {
      failures.push(`${f.id}: node not found`);
      continue;
    }
    const rect = node.getClientRect({ skipTransform: true });
    const lines = (node as unknown as { textArr?: unknown[] }).textArr?.length;
    metrics[f.id] = {
      className: node.getClassName(),
      width: Math.round(node.width() * 100) / 100,
      height: Math.round(node.height() * 100) / 100,
      rectWidth: Math.round(rect.width * 100) / 100,
      rectHeight: Math.round(rect.height * 100) / 100,
      lines,
    };
    if (!(node.width() > 0) || !(node.height() > 0)) {
      failures.push(`${f.id}: empty size`);
    }
    try {
      const { composites, width, height } =
        await instance.exportNodesServerSide([f.id], (n) => n, {
          format: "image/png" as never,
          padding: 10,
          pixelRatio: 1,
          backgroundColor: "#ffffff",
          quality: 1,
        });
      const png = await sharp({
        create: {
          width,
          height,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .composite(composites)
        .png()
        .toBuffer();
      fs.writeFileSync(path.join(outDir, `${f.id}.png`), png);
      // a rendered text must contain non-background pixels
      const { data } = await sharp(png)
        .raw()
        .toBuffer({ resolveWithObject: true });
      let ink = false;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] < 200) {
          ink = true;
          break;
        }
      }
      if (!ink) failures.push(`${f.id}: rendered image has no ink`);
      if (f.expectColor) {
        const [er, eg, eb] = f.expectColor;
        let found = false;
        for (let i = 0; i < data.length && !found; i += 4) {
          found =
            Math.abs(data[i] - er) < 40 &&
            Math.abs(data[i + 1] - eg) < 40 &&
            Math.abs(data[i + 2] - eb) < 40;
        }
        if (!found) failures.push(`${f.id}: expected colour mark not rendered`);
      }
      if (f.topInk) {
        const info = await sharp(png).metadata();
        const rowBytes = (info.width ?? 0) * 4;
        let topInk = false;
        for (let y = 10; y < 42 && !topInk; y++) {
          for (let x = 0; x < rowBytes; x += 4) {
            if (data[y * rowBytes + x] < 200) {
              topInk = true;
              break;
            }
          }
        }
        if (!topInk) failures.push(`${f.id}: first line not rendered`);
      }
    } catch (e) {
      failures.push(`${f.id}: export failed: ${(e as Error).message}`);
    }
  }

  await destroy();
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

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

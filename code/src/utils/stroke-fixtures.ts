// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/**
 * Shared helpers to build rooms made of stroke nodes and export them through
 * the server-side renderer. Used by `check:strokes`, `bench:strokes` and the
 * stroke export tests.
 */
import * as Y from "yjs";
import sharp from "sharp";
import * as sdk from "@inditextech/weave-sdk/server";
import { renderWeaveRoom } from "../canvas/weave.ts";
import type { ServiceConfig } from "../types.ts";

export type StrokePoint = { x: number; y: number; pressure: number };

export type StrokeProps = {
  x: number;
  y: number;
  width: number;
  height: number;
  strokeElements: StrokePoint[];
  stroke: string;
  strokeWidth: number;
  look?: Record<string, unknown>;
  opacity?: number;
  globalCompositeOperation?: string;
  dash?: number[];
};

export type StrokeSpec = { id: string; props: StrokeProps };

/** A wavy stroke in its own node space (origin at the node x/y). */
export const wavePoints = (
  n = 40,
  width = 300,
  amplitude = 40,
  pressure: (t: number) => number = () => 1,
): StrokePoint[] =>
  Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    return {
      x: t * width,
      y: amplitude + amplitude * Math.sin(t * Math.PI * 4),
      pressure: pressure(t),
    };
  });

export const makeStroke = (
  id: string,
  opts: Partial<StrokeProps> & { points?: StrokePoint[] } = {},
): StrokeSpec => {
  const { points, ...rest } = opts;
  const strokeElements = points ?? rest.strokeElements ?? wavePoints();
  const xs = strokeElements.map((p) => p.x);
  const ys = strokeElements.map((p) => p.y);
  const sw = rest.strokeWidth ?? 8;
  return {
    id,
    props: {
      x: 20,
      y: 20,
      width: Math.max(...xs) - Math.min(...xs) + sw,
      height: Math.max(...ys) - Math.min(...ys) + sw,
      stroke: "#000000ff",
      strokeWidth: sw,
      ...rest,
      strokeElements,
    },
  };
};

/**
 * Splits a stroke into `parts` pieces the way the stroke eraser does: the
 * first piece keeps the id, the others get a suffixed id, every piece keeps
 * look, colour and width and drops a gap of points where the eraser passed.
 */
/** The look of piece `k` of `parts`: a cut end loses its taper. */
const pieceLook = (
  look: Record<string, unknown> | undefined,
  k: number,
  parts: number,
) => {
  if (!look) return undefined;
  return {
    ...look,
    width: {
      ...((look.width as Record<string, unknown>) ?? {}),
      ...(k > 0 && { taperStart: 0 }),
      ...(k < parts - 1 && { taperEnd: 0 }),
    },
  };
};

export const splitStroke = (spec: StrokeSpec, parts = 3): StrokeSpec[] => {
  const pts = spec.props.strokeElements;
  const size = Math.floor(pts.length / parts);
  const pieces: StrokeSpec[] = [];
  for (let k = 0; k < parts; k++) {
    const to = k === parts - 1 ? pts.length : (k + 1) * size - 1;
    const slice = pts.slice(k * size, to);
    if (slice.length < 2) continue;
    const look = pieceLook(spec.props.look, k, parts);
    pieces.push(
      makeStroke(k === 0 ? spec.id : `${spec.id}-p${k}`, {
        ...spec.props,
        ...(look && { look }),
        points: slice,
      }),
    );
  }
  return pieces;
};

export const toYjs = (value: unknown): unknown => {
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

/** Base64 Yjs state of a room whose main layer holds the given strokes. */
export const buildStrokeRoom = (strokes: StrokeSpec[]): string => {
  const doc = new Y.Doc();
  const node = (id: string, type: string, props: Record<string, unknown>) => ({
    key: id,
    type,
    props: { id, nodeType: type, ...props },
  });
  const layer = (id: string, children: unknown[] = []) =>
    node(id, "layer", { children });
  const stage = node("stage", "stage", {
    children: [
      layer("gridLayer"),
      layer(
        "mainLayer",
        strokes.map((s) => node(s.id, "stroke", s.props)),
      ),
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

const config = {
  service: { port: 0 },
  internalToken: "",
  retentionTriggerToken: "",
} as unknown as ServiceConfig;

export const renderRoom = (room: string) => renderWeaveRoom(config, room);

type RenderedRoom = Awaited<ReturnType<typeof renderRoom>>;

export const exportPng = async (
  instance: RenderedRoom["instance"],
  ids: string[],
): Promise<Buffer> => {
  const { composites, width, height } = await instance.exportNodesServerSide(
    ids,
    (n) => n,
    {
      format: "image/png" as never,
      padding: 10,
      pixelRatio: 1,
      backgroundColor: "#ffffff",
      quality: 1,
    },
  );
  return sharp({
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
};

/** Same as `exportPng`, for an area of the stage (the nodes keep their ids). */
export const exportAreaPng = async (
  instance: RenderedRoom["instance"],
  area: { x: number; y: number; width: number; height: number },
): Promise<Buffer> => {
  const { composites, width, height } = await instance.exportAreaServerSide(
    area,
    {
      format: "image/png" as never,
      padding: 0,
      pixelRatio: 1,
      backgroundColor: "#ffffff",
      quality: 1,
    },
  );
  return sharp({
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
};

export type InkStats = {
  width: number;
  height: number;
  /** pixels that differ from the white background */
  ink: number;
};

/** Counts pixels that are not the white background (any channel differs). */
export const inkStats = async (png: Buffer): Promise<InkStats> => {
  const { data, info } = await sharp(png)
    .raw()
    .toBuffer({ resolveWithObject: true });
  let ink = 0;
  for (let i = 0; i < data.length; i += info.channels) {
    if (
      255 - data[i] > 20 ||
      255 - data[i + 1] > 20 ||
      255 - data[i + 2] > 20
    ) {
      ink++;
    }
  }
  return { width: info.width, height: info.height, ink };
};

type PenInstrument = {
  id: string;
  look: Record<string, unknown>;
  props: { opacity: number; globalCompositeOperation: string };
};

type PenApi = {
  createBrushInstruments?: (strokeWidth: number) => PenInstrument[];
  resolveBrushLookPatch?: (
    patch: Record<string, unknown>,
  ) => Record<string, unknown> | null;
};

const penApi = sdk as unknown as PenApi;

/** Whether the installed SDK ships the brush instruments (pens). */
export const hasPens = (): boolean =>
  typeof penApi.createBrushInstruments === "function" &&
  typeof penApi.resolveBrushLookPatch === "function";

/** The full stroke look of a look patch, as the brush tool stores it. */
export const penLook = (patch: Record<string, unknown>) =>
  penApi.resolveBrushLookPatch?.(patch) ?? undefined;

/**
 * One stroke per brush instrument (pencil, pen, fountain pen, brush,
 * fineliner, marker, highlighter) built from the SDK presets, plus looks that
 * isolate flat ends, tapers and seeded variance. Empty when the SDK has no pens.
 */
export const penStrokes = (strokeWidth = 12): StrokeSpec[] => {
  if (!hasPens()) return [];
  const pressure = (t: number) => 0.3 + 0.7 * Math.sin(t * Math.PI);
  const points = wavePoints(60, 300, 40, pressure);
  const instruments = (penApi.createBrushInstruments?.(strokeWidth) ?? []).map(
    (i) =>
      makeStroke(`pen-${i.id}`, {
        strokeWidth,
        points,
        look: penLook(i.look),
        ...i.props,
      }),
  );
  const custom = (id: string, patch: Record<string, unknown>) =>
    makeStroke(id, {
      strokeWidth,
      points,
      look: penLook({
        outline: "round",
        curve: "centripetal",
        pressureInterp: "linear",
        zoomAware: true,
        ...patch,
      }),
    });
  return [
    ...instruments,
    custom("pen-flat-ends", {
      ends: "flat",
      width: { min: 1, max: 1 },
    }),
    custom("pen-taper", {
      width: { min: 0.1, max: 1, taperStart: 40, taperEnd: 60 },
    }),
    custom("pen-variance", {
      variance: 0.8,
      width: { min: 0.4, max: 1 },
    }),
  ];
};

export type Rgb = [number, number, number];

/** Colour of one pixel of a PNG. */
export const pixelAt = async (
  png: Buffer,
  x: number,
  y: number,
): Promise<Rgb> => {
  const { data, info } = await sharp(png)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * info.channels;
  return [data[i], data[i + 1], data[i + 2]];
};

/** Ink pixels per column bucket: the width profile of a horizontal stroke. */
export const columnProfile = async (
  png: Buffer,
  bucket = 8,
): Promise<number[]> => {
  const { data, info } = await sharp(png)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const profile = new Array<number>(Math.ceil(info.width / bucket)).fill(0);
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      if (
        255 - data[i] > 20 ||
        255 - data[i + 1] > 20 ||
        255 - data[i + 2] > 20
      ) {
        profile[Math.floor(x / bucket)]++;
      }
    }
  }
  return profile;
};

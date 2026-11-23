// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-unused-vars */
import test, { mock } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";

const start = mock.fn(async (..._args: unknown[]) => "job-1");

mock.module("@/workloads/workloads.js", {
  namedExports: {
    getJobHandler: () => ({
      startNegateImageJob: start,
      startGrayscaleImageJob: start,
      startFlipImageJob: start,
      startRemoveImageBackgroundJob: start,
    }),
  },
});
mock.module("@/workloads/constants.js", {
  namedExports: {
    JOB_HANDLERS: {
      NEGATE_IMAGE: "n",
      GRAYSCALE_IMAGE: "g",
      FLIP_IMAGE: "f",
      REMOVE_IMAGE_BACKGROUND: "r",
    },
  },
});
mock.module("@/logger/logger.js", {
  namedExports: {
    getLogger: () => ({ child: () => ({ error: () => {}, info: () => {} }) }),
  },
});

const { postNegateImageController } = await import("./postNegateImage.ts");
const { postGrayscaleImageController } =
  await import("./postGrayscaleImage.ts");
const { postFlipImageController } = await import("./postFlipImage.ts");
const { postRemoveBackgroundController } =
  await import("../../v2/controllers/postRemoveBackground.ts");

const png = (
  await sharp({
    create: { width: 2, height: 2, channels: 3, background: "#fff" },
  })
    .png()
    .toBuffer()
).toString("base64");

const call = async (
  handler: (req: never, res: never) => Promise<void>,
  body: unknown,
) => {
  let status = 0;
  let payload: unknown;
  const res = {
    status(code: number) {
      status = code;
      return res;
    },
    json(p: unknown) {
      payload = p;
      return res;
    },
  };
  await handler(
    {
      params: { roomId: "room-a", imageId: "img-1", orientation: "horizontal" },
      headers: { "x-weave-user-id": "user-1", "x-weave-client-id": "c1" },
      session: { user: { id: "user-1" } },
      body,
    } as never,
    res as never,
  );
  return { status, payload };
};

const cases: [string, () => (req: never, res: never) => Promise<void>][] = [
  ["negate", postNegateImageController],
  ["grayscale", postGrayscaleImageController],
  ["flip", postFlipImageController],
  ["remove-background", postRemoveBackgroundController],
];

for (const [name, factory] of cases) {
  const image = (dataBase64: string) => ({
    image: { dataBase64, contentType: "image/png" },
  });

  test(`${name}: malformed image returns 400 and starts no job`, async () => {
    start.mock.resetCalls();
    const r = await call(factory(), image("bm90IGFuIGltYWdl"));
    assert.equal(r.status, 400);
    assert.equal(start.mock.callCount(), 0);
  });

  test(`${name}: empty image returns 400 and starts no job`, async () => {
    start.mock.resetCalls();
    const r = await call(factory(), image(""));
    assert.equal(r.status, 400);
    assert.equal(start.mock.callCount(), 0);
  });

  test(`${name}: missing image object returns 400 instead of throwing`, async () => {
    start.mock.resetCalls();
    const r = await call(factory(), {});
    assert.equal(r.status, 400);
    assert.equal(start.mock.callCount(), 0);
  });

  test(`${name}: valid image starts the job`, async () => {
    start.mock.resetCalls();
    const r = await call(factory(), image(png));
    assert.equal(r.status, 200);
    assert.equal(start.mock.callCount(), 1);
  });

  test(`${name}: job start failure returns 500 JSON`, async () => {
    start.mock.mockImplementationOnce(async () => {
      throw new Error("queue down");
    });
    const r = await call(factory(), image(png));
    assert.equal(r.status, 500);
  });
}

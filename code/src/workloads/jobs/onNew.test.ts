// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-unused-vars */
import test, { mock } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";

const createTask = mock.fn(async (..._args: unknown[]) => ({}));
const createImage = mock.fn(async (..._args: unknown[]) => ({}));

mock.module("@/database/controllers/task.js", {
  namedExports: { createTask, updateTask: async () => ({}) },
});
mock.module("@/database/controllers/image.js", {
  namedExports: { createImage, updateImage: async () => ({}) },
});
mock.module("@/comm-bus/comm-bus.js", {
  namedExports: { broadcastToRoom: () => {} },
});
mock.module("@/logger/logger.js", {
  namedExports: {
    getLogger: () => ({
      child: () => ({ error: () => {}, info: () => {}, warn: () => {} }),
    }),
  },
});
mock.module("@/config/config.js", {
  namedExports: { getServiceConfig: () => ({}) },
});
mock.module("@/database/database.js", {
  namedExports: { getDatabaseInstance: () => ({ query: async () => {} }) },
});
mock.module("@/images/persistence.js", {
  namedExports: { ImagesPersistenceHandler: class {} },
});
mock.module("@/utils.js", {
  namedExports: { saveBase64ToFile: async () => {} },
});
mock.module("@imgly/background-removal-node", {
  namedExports: { removeBackground: async () => new Blob() },
});

const { NegateImageJob } = await import("./negate-image/job.ts");
const { GrayscaleImageJob } = await import("./grayscale-image/job.ts");
const { FlipImageJob } = await import("./flip-image/job.ts");
const { RemoveImageBackgroundJob } =
  await import("./remove-image-background/job.ts");

const boss = { send: async () => "job-1" } as never;

const png = (
  await sharp({
    create: { width: 3, height: 2, channels: 3, background: "#fff" },
  })
    .png()
    .toBuffer()
).toString("base64");

type Starter = (image: {
  dataBase64: string;
  contentType: string;
}) => Promise<string>;

const starters: [string, () => Starter][] = [
  [
    "negate",
    () => (img) =>
      new NegateImageJob(boss).startNegateImageJob("c", "r", "u", "i", img),
  ],
  [
    "grayscale",
    () => (img) =>
      new GrayscaleImageJob(boss).startGrayscaleImageJob(
        "c",
        "r",
        "u",
        "i",
        img,
      ),
  ],
  [
    "flip",
    () => (img) =>
      new FlipImageJob(boss).startFlipImageJob(
        "c",
        "r",
        "u",
        "i",
        "horizontal",
        img,
      ),
  ],
  [
    "remove-background",
    () => (img) =>
      new RemoveImageBackgroundJob(boss).startRemoveImageBackgroundJob(
        "c",
        "r",
        "u",
        "i",
        img,
      ),
  ],
];

for (const [name, make] of starters) {
  test(`${name}: bad payload creates no task or image row`, async () => {
    createTask.mock.resetCalls();
    createImage.mock.resetCalls();
    await assert.rejects(
      make()({ dataBase64: "bm90IGFuIGltYWdl", contentType: "image/png" }),
    );
    assert.equal(createTask.mock.callCount(), 0);
    assert.equal(createImage.mock.callCount(), 0);
  });

  test(`${name}: valid payload creates task and image with dimensions`, async () => {
    createTask.mock.resetCalls();
    createImage.mock.resetCalls();
    const id = await make()({ dataBase64: png, contentType: "image/png" });
    assert.equal(id, "job-1");
    assert.equal(createTask.mock.callCount(), 1);
    const arg = createImage.mock.calls[0].arguments[0] as {
      width: number;
      height: number;
    };
    assert.equal(arg.width, 3);
    assert.equal(arg.height, 2);
  });
}

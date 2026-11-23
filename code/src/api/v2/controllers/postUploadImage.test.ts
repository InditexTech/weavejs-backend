// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-unused-vars */
import test, { mock } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";

const persist = mock.fn(async (..._args: unknown[]) => {});
const createImage = mock.fn(async (..._args: unknown[]) => ({
  toJSON: () => ({}),
}));

mock.module("@/images/persistence.js", {
  namedExports: {
    ImagesPersistenceHandler: class {
      exists = async () => false;
      persist = persist;
    },
  },
});
mock.module("@/database/controllers/image.js", {
  namedExports: { createImage },
});
mock.module("@/comm-bus/comm-bus.js", {
  namedExports: { broadcastToRoom: () => {} },
});
mock.module("@/config/config.js", {
  namedExports: { getServiceConfig: () => ({}) },
});

const { postUploadImageController } = await import("./postUploadImage.ts");

const call = async (buffer: Buffer) => {
  let status = 0;
  const res = {
    status(code: number) {
      status = code;
      return res;
    },
    json() {
      return res;
    },
  };
  await postUploadImageController()(
    {
      params: { roomId: "room-a" },
      body: { imageId: "123e4567-e89b-12d3-a456-426614174000" },
      file: {
        buffer,
        size: buffer.length,
        mimetype: "image/png",
      },
    } as never,
    res as never,
  );
  return status;
};

test("undecodable upload returns 400 and persists nothing", async () => {
  persist.mock.resetCalls();
  createImage.mock.resetCalls();
  assert.equal(await call(Buffer.from("not an image")), 400);
  assert.equal(persist.mock.callCount(), 0);
  assert.equal(createImage.mock.callCount(), 0);
});

test("valid upload is persisted", async () => {
  persist.mock.resetCalls();
  const png = await sharp({
    create: { width: 2, height: 2, channels: 3, background: "#fff" },
  })
    .png()
    .toBuffer();
  assert.equal(await call(png), 201);
  assert.equal(persist.mock.callCount(), 1);
});

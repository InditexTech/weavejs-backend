// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { decodeImageOrThrow, InvalidImageError } from "./validate.js";

test("decodeImageOrThrow returns buffer and dimensions for a valid PNG", async () => {
  const png = await sharp({
    create: { width: 4, height: 3, channels: 3, background: "#fff" },
  })
    .png()
    .toBuffer();

  const result = await decodeImageOrThrow(png.toString("base64"));

  assert.equal(result.width, 4);
  assert.equal(result.height, 3);
  assert.ok(result.buffer.equals(png));
});

test("decodeImageOrThrow rejects garbage bytes", async () => {
  await assert.rejects(
    decodeImageOrThrow(Buffer.from("not an image").toString("base64")),
    InvalidImageError,
  );
});

test("decodeImageOrThrow rejects empty data", async () => {
  await assert.rejects(decodeImageOrThrow(""), InvalidImageError);
});

test("decodeImageOrThrow rejects invalid base64 that decodes to nothing", async () => {
  await assert.rejects(decodeImageOrThrow("!!!"), InvalidImageError);
});

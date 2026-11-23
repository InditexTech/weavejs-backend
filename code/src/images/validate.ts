// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import sharp from "sharp";
import { z } from "zod";

export const IMAGE_BASE64_MAX = 15 * 1024 * 1024; // 15 MB of base64 chars ≈ ~11 MB decoded

export const imagePayloadSchema = z.object({
  image: z.object({
    replaceImage: z.string().optional(),
    dataBase64: z.string().max(IMAGE_BASE64_MAX),
    contentType: z.string().max(100),
  }),
});

export class InvalidImageError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "InvalidImageError";
  }
}

export type DecodedImage = {
  buffer: Buffer;
  width: number;
  height: number;
};

export async function decodeImageOrThrow(
  dataBase64: string,
): Promise<DecodedImage> {
  return validateImageBufferOrThrow(Buffer.from(dataBase64, "base64"));
}

export async function validateImageBufferOrThrow(
  buffer: Buffer,
): Promise<DecodedImage> {
  if (buffer.length === 0) {
    throw new InvalidImageError("Image data is empty");
  }

  let width: number | undefined;
  let height: number | undefined;
  try {
    const metadata = await sharp(buffer).metadata();
    width = metadata.width;
    height = metadata.height;
  } catch (cause) {
    throw new InvalidImageError("Image data is not a valid image", { cause });
  }

  if (!width || !height || width <= 0 || height <= 0) {
    throw new InvalidImageError("Image has invalid dimensions");
  }

  return { buffer, width, height };
}

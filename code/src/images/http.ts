// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Response } from "express";
import { getLogger } from "../logger/logger.js";
import {
  decodeImageOrThrow,
  imagePayloadSchema,
  InvalidImageError,
} from "./validate.js";

export type ImageJobPayload = {
  replaceImage?: string;
  dataBase64: string;
  contentType: string;
};

// Responds 400 and returns null when the body is not a valid image payload.
export async function readValidatedImagePayload(
  body: unknown,
  res: Response,
): Promise<ImageJobPayload | null> {
  const parsedBody = imagePayloadSchema.safeParse(body);
  if (!parsedBody.success) {
    res.status(400).json({ errors: parsedBody.error.issues });
    return null;
  }

  const image = parsedBody.data.image;

  try {
    await decodeImageOrThrow(image.dataBase64);
  } catch (ex) {
    respondImageJobError(res, ex, "image-payload", "validating the image");
    return null;
  }

  return image;
}

export function respondImageJobError(
  res: Response,
  ex: unknown,
  module: string,
  action: string,
) {
  if (ex instanceof InvalidImageError) {
    res.status(400).json({ status: "KO", message: ex.message });
    return;
  }

  getLogger().child({ module }).error({ err: ex }, `Error ${action}`);
  res.status(500).json({ status: "KO", message: `Error ${action}` });
}

// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { Request, Response } from "express";
import mimeTypes from "mime-types";
import { removeBackground } from "@imgly/background-removal-node";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";
import { saveBase64ToFile } from "../../../utils.js";
import { getServiceConfig } from "@/config/config.js";

const IMAGE_BASE64_MAX = 15 * 1024 * 1024; // 15 MB of base64 chars ≈ ~11 MB decoded

const payloadSchema = z.object({
  image: z.object({
    dataBase64: z.string().max(IMAGE_BASE64_MAX),
    contentType: z.string().max(100),
  }),
});

async function myBlobToUIntDemo(blob: Blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return new Uint8Array(buffer);
}

export const postRemoveBackgroundController = () => {
  const config = getServiceConfig();
  const persistenceHandler = new ImagesPersistenceHandler(config);
  const baseTempDir = path.join(process.cwd(), "temp");
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const imageId = req.params.imageId as string;
    // Validate roomId and imageId to prevent path traversal and unsafe characters
    if (
      !roomId ||
      !imageId ||
      !/^[a-zA-Z0-9_-]+$/.test(roomId) ||
      !/^[a-zA-Z0-9_-]+$/.test(imageId)
    ) {
      res
        .status(400)
        .json({ status: "KO", message: "Invalid roomId or imageId." });
      return;
    }
    const parsedBody = payloadSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ errors: parsedBody.error.issues });
      return;
    }
    const { dataBase64, contentType } = parsedBody.data.image;

    const extension = mimeTypes.extension(contentType) || "png";
    const fileName = `${roomId}/${imageId}.${extension}`;
    const filePath = path.resolve(baseTempDir, fileName);
    // Ensure that filePath is strictly inside baseTempDir
    if (!filePath.startsWith(baseTempDir + path.sep)) {
      res
        .status(400)
        .json({ status: "KO", message: "Invalid path traversal attempt." });
      return;
    }

    await saveBase64ToFile(dataBase64, filePath);
    try {
      removeBackground(filePath, {
        publicPath: `file://${path.join(process.cwd(), "public")}/`,
        output: { format: "image/png", quality: 1 },
      })
        .then(async (blob: Blob) => {
          // The result is a blob encoded as PNG. It can be converted to an URL to be used as HTMLImage.src
          const data = await myBlobToUIntDemo(blob);
          const fileNameRemoved = `${fileName}-removed`;
          await persistenceHandler.persist(
            fileNameRemoved,
            { size: data.length, mimeType: "image/png" },
            data,
          );
          fs.rmSync(filePath);

          res.status(201).json({
            status: "Image created OK",
            fileName: fileNameRemoved,
            mimeType: "image/png",
          });
        })
        .catch((err) => {
          fs.rmSync(filePath);
          console.error(err);
          res
            .status(500)
            .json({ status: "KO", message: "Error transforming the image" });
        });
    } catch (ex) {
      fs.rmSync(filePath);
      console.error(ex);
      res
        .status(500)
        .json({ status: "KO", message: "Error downloading the image" });
    }
  };
};

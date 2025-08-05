// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import fs from "node:fs";
import path from "node:path";
import { Request, Response } from "express";
import mimeTypes from "mime-types";
import { removeBackground } from "@imgly/background-removal-node";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";
import { saveBase64ToFile } from "../../../utils.js";

async function myBlobToUIntDemo(blob: Blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return new Uint8Array(buffer);
}

export const postRemoveBackgroundController = () => {
  const persistenceHandler = new ImagesPersistenceHandler();

  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    const imageId = req.params.imageId;
    const {
      image: { dataBase64, contentType },
    } = req.body;

    const extension = mimeTypes.extension(contentType) || "png";
    const fileName = `${roomId}/${imageId}.${extension}`;
    const filePath = path.join(process.cwd(), "temp", fileName);

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
            data
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

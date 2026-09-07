// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import sharp from "sharp";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";
import { createImage } from "../../../database/controllers/image.js";
import { ImageModel } from "../../../database/models/image.js";
import { broadcastToRoom } from "../../../comm-bus/comm-bus.js";
import { getServiceConfig } from "@/config/config.js";
// import { sleep } from "@/utils.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const postUploadImageController = () => {
  const config = getServiceConfig();
  const persistenceHandler = new ImagesPersistenceHandler(config);

  return async (req: Request, res: Response): Promise<void> => {
    const file = req.file;

    const roomId = req.params.roomId as string;
    const imageId = req.body.imageId as string;

    if (!imageId || !UUID_REGEX.test(imageId)) {
      res
        .status(400)
        .json({ status: "KO", message: "imageId must be a valid UUID" });
      return;
    }

    const mimeType = file?.mimetype ?? "application/octet-stream";
    const data = file?.buffer ?? new Uint8Array();

    const fileName = `${roomId}/${imageId}`;

    if (await persistenceHandler.exists(fileName)) {
      res.status(500).json({ status: "KO", message: "Image already exists" });
      return;
    }

    try {
      if (file) {
        const dimensions = await sharp(data).metadata();

        await persistenceHandler.persist(
          fileName,
          { size: file.size, mimeType },
          data,
        );

        // await sleep(15000);

        console.log("Image persisted successfully:", fileName);

        const imageModel = await createImage({
          roomId,
          imageId,
          operation: "uploaded",
          status: "completed",
          mimeType: mimeType,
          fileName,
          width: dimensions.width,
          height: dimensions.height,
          aspectRatio: dimensions.width / dimensions.height,
          jobId: null,
          removalJobId: null,
          removalStatus: null,
        });

        broadcastToRoom(roomId, {
          jobId: null,
          type: "addImage",
          status: "failed",
        });

        const imageJson: ImageModel = imageModel.toJSON();

        res.status(201).json({ status: "Image created OK", image: imageJson });
      } else {
        res.status(500).json({ status: "KO", message: "Error creating image" });
      }
    } catch {
      res.status(500).json({ status: "KO", message: "Error creating image" });
    }
  };
};

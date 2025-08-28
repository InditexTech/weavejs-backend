// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { imageSize } from "image-size";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";
import { createImage } from "../../../database/controllers/image.js";
import { ImageModel } from "../../../database/models/image.js";
import { notifyRoomClients } from "./getServerSideEvents.js";

export const postUploadImageController = () => {
  const persistenceHandler = new ImagesPersistenceHandler();

  return async (req: Request, res: Response): Promise<void> => {
    const file = req.file;

    const roomId = req.params.roomId;
    const mimeType = file?.mimetype ?? "application/octet-stream";
    const data = file?.buffer ?? new Uint8Array();

    const dimensions = imageSize(data);

    const imageId = uuidv4();
    const fileName = `${roomId}/${imageId}`;

    if (await persistenceHandler.exists(fileName)) {
      res.status(500).json({ status: "KO", message: "Image already exists" });
    }

    try {
      if (file) {
        await persistenceHandler.persist(
          fileName,
          { size: file.size, mimeType },
          data
        );

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

        notifyRoomClients(roomId, {
          jobId: null,
          type: "addImage",
          status: "failed",
        });

        const imageJson: ImageModel = imageModel.toJSON();

        res.status(201).json({ status: "Image created OK", image: imageJson });
      } else {
        res.status(500).json({ status: "KO", message: "Error creating image" });
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      res.status(500).json({ status: "KO", message: "Error creating image" });
    }
  };
};

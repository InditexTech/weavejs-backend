// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { pipeline } from "stream/promises";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";
import { getServiceConfig } from "@/config/config.js";

export const getImageController = () => {
  const config = getServiceConfig();
  const persistenceHandler = new ImagesPersistenceHandler(config);

  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const imageId = req.params.imageId as string;

    const fileName = `${roomId}/${imageId}`;

    if (!(await persistenceHandler.exists(fileName))) {
      res.status(404).json({ status: "KO", message: "Image doesn't exists" });
      return;
    }

    const { response } = await persistenceHandler.fetch(fileName);

    if (response && response.readableStreamBody) {
      // Setting headers for the response
      res.set("Cache-Control", "public, max-age=86400"); // 1 day
      res.setHeader("Content-Type", "application/octet-stream");

      try {
        await pipeline(response.readableStreamBody, res);
      } catch {
        if (!res.headersSent) {
          res.status(500).json({
            status: "KO",
            message: "Download image failed",
          });
        }
      }
    } else {
      res
        .status(500)
        .json({ status: "KO", message: "Error downloading image" });
    }
  };
};

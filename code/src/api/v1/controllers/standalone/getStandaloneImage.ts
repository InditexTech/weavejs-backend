// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { pipeline } from "stream/promises";
import { ImagesPersistenceHandler } from "@/images/persistence.js";
import { getServiceConfig } from "@/config/config.js";

export const getStandaloneImageController = () => {
  const config = getServiceConfig();
  const persistenceHandler = new ImagesPersistenceHandler(
    config,
    "standalone-images",
  );

  return async (req: Request, res: Response): Promise<void> => {
    const instanceId = req.params.instanceId as string;
    const imageId = req.params.imageId as string;

    const fileName = `${instanceId}/${imageId}`;

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
        // Pipe the blob stream directly to the response (no buffering in memory)
        await pipeline(response.readableStreamBody, res);
      } catch {
        if (!res.headersSent) {
          res.status(500).json({
            status: "KO",
            message: "Download standalone image failed",
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

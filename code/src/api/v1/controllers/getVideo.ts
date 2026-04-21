// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { pipeline } from "stream/promises";
import { VideosPersistenceHandler } from "../../../videos/persistence.js";

export const getVideoController = () => {
  const persistenceHandler = new VideosPersistenceHandler();

  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const videoId = req.params.videoId as string;

    const fileName = `${roomId}/${videoId}`;

    if (!(await persistenceHandler.exists(fileName))) {
      res.status(404).json({ status: "KO", message: "Video doesn't exists" });
      return;
    }

    const { response } = await persistenceHandler.fetch(fileName);

    if (response && response.readableStreamBody) {
      // Setting headers for the response
      res.setHeader("Cache-Control", "public, max-age=86400"); // 1 day
      res.setHeader("Content-Type", "application/octet-stream");

      try {
        // Pipe the blob stream directly to the response (no buffering in memory)
        await pipeline(response.readableStreamBody, res);
      } catch {
        if (!res.headersSent) {
          res.status(500).json({
            status: "KO",
            message: "Download video failed",
          });
        }
      }
    } else {
      res
        .status(500)
        .json({ status: "KO", message: "Error downloading video" });
    }
  };
};

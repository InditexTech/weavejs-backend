// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { VideosPersistenceHandler } from "../../../videos/persistence.js";

export const getVideoController = () => {
  const persistenceHandler = new VideosPersistenceHandler();

  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    const videoId = req.params.videoId;

    const fileName = `${roomId}/${videoId}`;

    if (!(await persistenceHandler.exists(fileName))) {
      res.status(404).json({ status: "KO", message: "Video doesn't exists" });
      return;
    }

    const { response } = await persistenceHandler.fetch(fileName);

    if (response && response.readableStreamBody) {
      // Setting headers for the response
      res.set("Cache-Control", "public, max-age=86400"); // 1 day
      res.setHeader("Content-Type", "application/octet-stream");
      response.readableStreamBody.pipe(res);
    } else {
      res
        .status(500)
        .json({ status: "KO", message: "Error downloading video" });
    }
  };
};

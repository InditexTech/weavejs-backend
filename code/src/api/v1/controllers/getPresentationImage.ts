// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";
import { getServiceConfig } from "@/config/config.js";

export const getPresentationImageController = () => {
  const config = getServiceConfig();
  const persistenceHandler = new ImagesPersistenceHandler(
    config,
    "presentation-images",
  );

  return async (req: Request, res: Response): Promise<void> => {
    const presentationId = req.params.presentationId as string;
    const pageId = req.params.pageId as string;

    const fileName = `${presentationId}/${pageId}`;

    if (!(await persistenceHandler.exists(fileName))) {
      res
        .status(404)
        .json({ status: "KO", message: "Presentation image doesn't exists" });
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
        .json({ status: "KO", message: "Error downloading image" });
    }
  };
};

// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";

export const getChatImageController = () => {
  const persistenceHandler = new ImagesPersistenceHandler(
    process.env.AZURE_STORAGE_GENERATED_IMAGES_CONTAINER_NAME ??
      "generated-images"
  );

  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    const chatId = req.params.chatId;
    const imageId = req.params.imageId;

    const fileName = `${roomId}/${chatId}/${imageId}`;

    console.log(`Fetching image from path: ${fileName}`);

    if (!(await persistenceHandler.exists(fileName))) {
      res.status(404).json({ status: "KO", message: "Image doesn't exists" });
      return;
    }

    const { response } = await persistenceHandler.fetch(fileName);

    if (response?.readableStreamBody) {
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

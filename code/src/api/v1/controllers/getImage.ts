// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";

export const getImageController = () => {
  const persistenceHandler = new ImagesPersistenceHandler()
  
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    const imageId = req.params.imageId;

    const fileName = `${roomId}/${imageId}`;

    if (!await persistenceHandler.exists(fileName)) {
      res.status(404).json({ status: "KO", message: "Image doesn't exists" });
      return 
    }

    const { response } = await persistenceHandler.fetch(fileName);

    if (response  && response.readableStreamBody) {
      // Setting headers for the response
      res.setHeader("Content-Type", "application/octet-stream");
      response.readableStreamBody.pipe(res);
    } else {
      res.status(500).json({ status: "KO", message: "Error downloading image" });
    }
  };
}

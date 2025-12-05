// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { ImagesPersistenceHandler } from "@/images/persistence.js";

export const putStandaloneSaveInstanceImageController = () => {
  const persistenceHandler = new ImagesPersistenceHandler(
    "standalone-instance-image-data"
  );

  return async (req: Request, res: Response): Promise<void> => {
    const payload = req.body;

    if (!payload.data) {
      res.status(400).json({ status: "KO", message: "Missing data" });
      return;
    }

    const instanceId = req.params.instanceId;
    const imageId = req.params.imageId;

    const dataBase64 = payload.data.toString();
    const buffer = Buffer.from(dataBase64, "base64");
    const data = Uint8Array.from(buffer);

    const docName = `${instanceId}/${imageId}`;

    try {
      await persistenceHandler.persist(
        docName,
        { size: data.length, mimeType: "application/octet-stream" },
        data
      );

      res
        .status(200)
        .json({ status: "Instance / image data saved OK", docName });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ status: "KO", message: "Error saving instance / image data" });
    }
  };
};

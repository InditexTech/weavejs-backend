// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { ImagesPersistenceHandler } from "@/images/persistence.js";

export const getStandaloneInstanceImageController = () => {
  const persistenceHandler = new ImagesPersistenceHandler(
    "standalone-instance-image-data"
  );

  return async (req: Request, res: Response): Promise<void> => {
    const instanceId = req.params.instanceId;
    const imageId = req.params.imageId;

    const fileName = `${instanceId}/${imageId}`;

    if (!(await persistenceHandler.exists(fileName))) {
      res.status(404).json({
        status: "KO",
        message: "Instance / Image data doesn't exists",
      });
      return;
    }

    const { response } = await persistenceHandler.fetch(fileName);

    if (response && response.readableStreamBody) {
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.readableStreamBody) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }

      const buffer = Buffer.concat(chunks);
      res.status(200).json({ data: buffer.toString("base64") });
    } else {
      res.status(500).json({
        status: "KO",
        message: "Error downloading the instance / image data",
      });
    }
  };
};

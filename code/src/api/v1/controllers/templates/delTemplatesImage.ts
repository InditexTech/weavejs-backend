// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { ImagesPersistenceHandler } from "@/images/persistence.js";

export const delTemplatesImageController = () => {
  const persistenceHandler = new ImagesPersistenceHandler("templates-images");

  return async (req: Request, res: Response): Promise<void> => {
    const instanceId = req.params.instanceId as string;
    const imageId = req.params.imageId as string;

    const fileName = `${instanceId}/${imageId}`;

    const result = await persistenceHandler.delete(fileName);

    if (result) {
      res.status(200).json({ status: "KO", message: "Image deleted" });
      return;
    }

    res.status(404).json({ status: "KO", message: "Image not found" });
  };
};

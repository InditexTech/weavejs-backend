// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { ImagesPersistenceHandler } from "@/images/persistence.js";

export const getStandaloneImagesController = () => {
  const persistenceHandler = new ImagesPersistenceHandler("standalone-images");

  return async (req: Request, res: Response): Promise<void> => {
    const instanceId = req.params.instanceId;

    const pageSize = parseInt(
      (req.query.pageSize as string | undefined) ?? "20"
    );
    const continuationToken = req.query.continuationToken as string | undefined;

    const images = await persistenceHandler.list(
      instanceId,
      pageSize,
      continuationToken
    );

    res.status(200).json(images);
  };
};

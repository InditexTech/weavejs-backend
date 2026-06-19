// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { ImagesPersistenceHandler } from "../../../images/persistence.js";
import { getServiceConfig } from "@/config/config.js";

export const getImagesController = () => {
  const config = getServiceConfig();
  const persistenceHandler = new ImagesPersistenceHandler(config);

  const MAX_PAGE_SIZE = 100;

  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;

    const pageSize = Math.min(
      Math.max(1, parseInt((req.query.pageSize as string | undefined) ?? "20")),
      MAX_PAGE_SIZE,
    );
    const continuationToken = req.query.continuationToken as string | undefined;

    const images = await persistenceHandler.list(
      roomId,
      pageSize,
      continuationToken,
    );

    res.status(200).json(images);
  };
};

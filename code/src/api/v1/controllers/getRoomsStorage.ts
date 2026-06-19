// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { listRooms } from "@/storage/storage.js";
import { Request, Response } from "express";

export const getRoomsStorageController = () => {
  const MAX_PAGE_SIZE = 100;

  return async (req: Request, res: Response): Promise<void> => {
    // TODO: This endpoint lists all room blobs without scoping to the caller.
    // It should be restricted to admin users or removed before production deployment.
    const pageSize = Math.min(
      Math.max(1, parseInt((req.query.pageSize as string | undefined) ?? "20")),
      MAX_PAGE_SIZE,
    );
    const continuationToken = req.query.continuationToken as string | undefined;

    const result = await listRooms("", pageSize, continuationToken);

    res.status(200).json(result);
  };
};

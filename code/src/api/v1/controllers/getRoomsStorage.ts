// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { listRooms } from "@/storage/storage.js";
import { Request, Response } from "express";

export const getRoomsStorageController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const pageSize = parseInt(
      (req.query.pageSize as string | undefined) ?? "20",
    );
    const continuationToken = req.query.continuationToken as string | undefined;

    const result = await listRooms("", pageSize, continuationToken);

    res.status(200).json(result);
  };
};

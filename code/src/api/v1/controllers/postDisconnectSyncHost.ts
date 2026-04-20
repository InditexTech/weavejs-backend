// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { disconnectStoreForRoom } from "@/store.js";

export const postDisconnectSyncHostController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const boyd = req.body;
    const roomId = boyd.roomId as string;

    disconnectStoreForRoom(roomId);

    res.status(201).json({
      message: "Operation performed",
    });
  };
};

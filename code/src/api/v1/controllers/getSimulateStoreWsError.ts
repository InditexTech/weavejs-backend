// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getStore } from "../../../store.js";

export const getSimulateStoreWsErrorController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;

    const store = getStore();
    const syncHandler = store.getSyncHandler();
    const roomHost = syncHandler.getRoomSyncHost(roomId);

    if (!roomHost) {
      res.status(404).json({ message: `Room ${roomId} not found` });
      return;
    }

    roomHost.simulateWebsocketError();

    res.status(200).json({ message: `Simulated error for room ${roomId}` });
  };
};

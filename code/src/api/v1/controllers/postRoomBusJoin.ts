// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getCommBus } from "../../../comm-bus/comm-bus.js";

export const postRoomBusJoinController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const serviceClient = getCommBus();

    const roomId = req.params.roomId as string;
    const userId = req.params.userId as string;

    if (!serviceClient) {
      res.status(500).json({ error: "Azure Web PubSub bus not found" });
      return;
    }

    await serviceClient.group(`${roomId}.commbus`).addUser(userId);

    res.status(200).json({ success: true });
  };
};

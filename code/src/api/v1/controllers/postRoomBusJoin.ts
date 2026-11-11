// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getCommBus } from "../../../comm-bus/comm-bus.js";

export const postRoomBusJoinController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const serviceClient = getCommBus();

    const roomId = req.params.roomId as string;
    const userId = req.session!.user.id;

    if (!serviceClient) {
      res.status(500).json({ error: "Azure Web PubSub bus not found" });
      return;
    }

    try {
      await serviceClient.group(`${roomId}.commbus`).addUser(userId);
    } catch (ex) {
      const error = ex as { statusCode?: number; code?: string };
      if (error.statusCode === 404) {
        res.status(409).json({
          error: "User has no active connection to the Azure Web PubSub bus",
          code: error.code,
        });
        return;
      }
      res
        .status(500)
        .json({ error: "Error joining the Azure Web PubSub bus group" });
      return;
    }

    res.status(200).json({ success: true });
  };
};

// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getCommBus } from "../../../comm-bus/comm-bus.js";

export const getRoomBusNegotiateController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const serviceClient = getCommBus();

    const roomId = req.params.roomId;
    const userId = req.params.userId;

    if (!serviceClient) {
      res.status(500).json({ error: "Azure Web PubSub bus not found" });
      return;
    }

    const roles = [
      `webpubsub.joinLeaveGroup.${roomId}.commbus`,
      `webpubsub.sendToGroup.${roomId}.commbus`,
    ];

    const response = await serviceClient.getClientAccessToken({
      roles,
      userId,
    });

    if (!response) {
      res
        .status(500)
        .json({ error: "Error connecting to Azure Web PubSub bus" });
      return;
    }

    res.status(200).json(response);
  };
};

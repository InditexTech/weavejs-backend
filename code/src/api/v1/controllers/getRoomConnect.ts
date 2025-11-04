// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getAzureWebPubsubServer } from "../../../store.js";

export const getRoomConnectController =
  () =>
  async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    const expirationTimeInMinutes: string | undefined =
      (req.query?.tetm as string) ?? undefined;

    if (!getAzureWebPubsubServer) {
      res.status(500).json({ error: "Azure Web PubSub server not found" });
      return;
    }

    try {
      const url = await getAzureWebPubsubServer().clientConnect(roomId, {
        expirationTimeInMinutes:
          typeof expirationTimeInMinutes !== "undefined"
            ? parseInt(expirationTimeInMinutes)
            : 60,
      });
      res.status(200).json({ url });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Error connecting to Azure Web PubSub" });
    }
  };

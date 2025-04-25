// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getAzureWebPubsubServer } from "../../../store.js";

export const getRoomConnectController =
  () => async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    
    if (!getAzureWebPubsubServer) {
      res.status(500).json({ error: 'Azure Web PubSub server not found' });
      return;
    }

    const url = await getAzureWebPubsubServer().clientConnect(roomId);

    res.status(200).json({ url });
  };

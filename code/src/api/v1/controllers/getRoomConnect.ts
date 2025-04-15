// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getRoomsEventHandler } from "../../../middlewares/rooms.js";

export const getRoomConnectController =
  () => async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;

    const url = await getRoomsEventHandler().getClientConnectionUrl(roomId);

    res.status(200).json({ url });
  };

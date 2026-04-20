// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getRoom } from "@/database/controllers/room.js";
import { getRoomUser } from "@/database/controllers/room-user.js";

export const getRoomController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;

    const roomObj = await getRoom({
      roomId,
    });

    if (!roomObj) {
      res.status(404).json({
        status: "KO",
        message: "Room not found",
      });
      return;
    }

    const roomUserObj = await getRoomUser({
      roomId,
      userId: req.session.user.id,
    });

    if (!roomUserObj) {
      res.status(403).json({
        status: "KO",
        message: "You don't have access to this room",
      });
      return;
    }

    res.status(200).json({ room: roomObj, roomUser: roomUserObj });
  };
};

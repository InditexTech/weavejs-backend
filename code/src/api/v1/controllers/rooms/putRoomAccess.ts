// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getRoom } from "@/database/controllers/room.js";
import { getDatabaseInstance } from "@/database/database.js";
import {
  createRoomUser,
  getRoomUser,
} from "@/database/controllers/room-user.js";
import { getRoomAccess } from "@/database/controllers/room-access.js";

export const putRoomAccessController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const accessId = req.params.accessId as string;

    const { accessCode } = req.body;

    const roomAccessObj = await getRoomAccess({
      id: accessId,
    });

    if (!roomAccessObj) {
      res.status(404).json({
        status: "KO",
        message: "Invalid room access id",
      });
      return;
    }

    if (roomAccessObj.code !== accessCode) {
      res.status(403).json({
        status: "KO",
        message: "Invalid room access code",
      });
      return;
    }

    const roomObj = await getRoom({
      roomId: roomAccessObj.roomId,
    });

    if (!roomObj) {
      res.status(404).json({
        status: "KO",
        message: "Room not found",
      });
      return;
    }

    const roomUserObj = await getRoomUser({
      roomId: roomAccessObj.roomId,
      userId: req.session.user.id,
    });

    if (roomUserObj) {
      res.status(200).json(roomUserObj);
      return;
    }

    try {
      await getDatabaseInstance().transaction(async () => {
        const roomUserObj = await createRoomUser({
          roomId: roomAccessObj.roomId,
          userId: req.session.user.id,
          role: "user",
        });

        res.status(200).json(roomUserObj);
      });
    } catch (error) {
      console.error("Transaction error:", error);
      res.status(500).json({ status: "KO", message: "Error joining room" });
      return;
    }
  };
};

// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { createRoomUser } from "@/database/controllers/room-user.js";
import { createRoom, getRoom } from "@/database/controllers/room.js";
import { getDatabaseInstance } from "@/database/database.js";
import { Request, Response } from "express";

export const postRoomController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const { roomId, name, kind, status } = req.body;

    const roomObj = await getRoom({
      roomId,
    });

    if (roomObj) {
      res.status(409).json({ status: "KO", message: "Room already exists" });
      return;
    }

    try {
      await getDatabaseInstance().transaction(async () => {
        const room = await createRoom({
          roomId,
          status,
          name,
          kind,
        });

        const roomUser = await createRoomUser({
          roomId,
          userId: req.session.user.id,
          role: "owner",
        });

        res.status(201).json({ room, roomUser });
      });
    } catch (error) {
      console.error("Transaction error:", error);
      res.status(500).json({ status: "KO", message: "Error creating room" });
      return;
    }
  };
};

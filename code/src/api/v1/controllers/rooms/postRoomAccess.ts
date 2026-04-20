// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import crypto from "crypto";
import { createRoomAccess } from "@/database/controllers/room-access.js";
import { getRoomUser } from "@/database/controllers/room-user.js";
import { getRoom } from "@/database/controllers/room.js";
import { getDatabaseInstance } from "@/database/database.js";
import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";

export const postRoomAccessController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const { roomId, validForSeconds } = req.body;

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

    try {
      await getDatabaseInstance().transaction(async () => {
        const roomAccess = await createRoomAccess({
          id: uuidv4(),
          roomId,
          userId: req.session.user.id,
          code: crypto.randomBytes(24).toString("hex"),
          validUntilUTC: new Date(Date.now() + validForSeconds * 1000),
        });

        res.status(201).json(roomAccess);
      });
    } catch (error) {
      console.error("Transaction error:", error);
      res
        .status(500)
        .json({ status: "KO", message: "Error creating room access" });
      return;
    }
  };
};

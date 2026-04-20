// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { broadcastToGlobal, broadcastToRoom } from "@/comm-bus/comm-bus.js";
import { getRoomUser } from "@/database/controllers/room-user.js";
import { getRoom, updateRoom } from "@/database/controllers/room.js";
import { Request, Response } from "express";

export const putRoomController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;

    const { name } = req.body;

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

    let room = undefined;
    try {
      room = await updateRoom(
        { roomId },
        {
          name,
        },
      );
    } catch (error) {
      console.error("Error updating room:", error);
    }

    if (!room) {
      res.status(500).json({ status: "KO", message: "Error updating room" });
      return;
    }

    broadcastToGlobal({
      type: "roomUpdated",
      payload: {
        roomId,
      },
    });

    broadcastToRoom(roomId, {
      roomId,
      type: "roomUpdated",
      payload: {
        roomId,
      },
    });

    res.status(200).json(room);
  };
};

// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { broadcastToGlobal, broadcastToRoom } from "@/comm-bus/comm-bus.js";
import { getRoomUser } from "@/database/controllers/room-user.js";
import { getRoom, updateRoom } from "@/database/controllers/room.js";
import { Request, Response } from "express";

export const delRoomController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;

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

    const archived = await updateRoom(
      {
        roomId,
      },
      {
        status: "archived",
      },
    );

    if (archived === 1) {
      broadcastToGlobal({
        type: "roomDeleted",
        payload: {
          roomId,
        },
      });

      broadcastToRoom(roomId, {
        roomId,
        type: "roomDeleted",
        payload: {
          roomId,
        },
      });

      res.status(200).json({
        status: "Room archived OK",
      });
    } else {
      res.status(500).json({
        status: "KO",
        message: "Error archiving room",
      });
    }
  };
};

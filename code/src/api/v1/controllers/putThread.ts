// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import {
  getThread,
  updateThread,
} from "../../../database/controllers/thread.js";
import { broadcastToRoom } from "../../../comm-bus/comm-bus.js";

export const putThreadController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const threadId = req.params.threadId as string;

    const userId: string = req.session!.user.id;

    if (!roomId) {
      res.status(400).json({
        status: "KO",
        message: "Missing required fields",
      });
      return;
    }

    const thread = await getThread({
      threadId,
    });

    if (!thread) {
      res.status(404).json({ status: "KO", message: "Thread doesn't exist" });
      return;
    }

    if (thread.roomId !== roomId) {
      res
        .status(404)
        .json({ status: "KO", message: "Thread doesn't belong to this room" });
      return;
    }

    if (thread.userId !== userId && req.body.content) {
      res
        .status(403)
        .json({ status: "KO", message: "Thread doesn't belong to this user" });
      return;
    }

    const updated = await updateThread(
      {
        threadId,
      },
      req.body
    );

    if (updated === 1) {
      const thread = await getThread({
        threadId,
      });

      broadcastToRoom(roomId, {
        type: "commentUpdated",
        status: "created",
      });

      res.status(200).json({
        thread,
      });
    } else {
      res.status(500).json({
        status: "KO",
        message: "Thread failed to update",
      });
    }
  };
};

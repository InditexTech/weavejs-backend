// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getThread } from "../../../database/controllers/thread.js";
import {
  getThreadAnswer,
  updateThreadAnswer,
} from "../../../database/controllers/thread-answer.js";
import { broadcastToRoom } from "../../../comm-bus/comm-bus.js";

export const putThreadAnswerController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const threadId = req.params.threadId as string;
    const answerId = req.params.answerId as string;

    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";
    const clientId: string = (req.headers["x-weave-client-id"] as string) ?? "";

    if (!clientId || clientId === "" || !userId || userId === "" || !roomId) {
      res.status(400).json({
        status: "KO",
        message: "Missing required fields",
      });
      return;
    }

    const threadAnswer = await getThreadAnswer({
      answerId,
    });

    if (!threadAnswer) {
      res
        .status(404)
        .json({ status: "KO", message: "Thread answer doesn't exist" });
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

    if (thread.userId !== userId) {
      res
        .status(404)
        .json({ status: "KO", message: "Thread doesn't belong to this user" });
      return;
    }

    const updated = await updateThreadAnswer(
      {
        answerId,
      },
      req.body
    );

    if (updated === 1) {
      const threadAnswer = await getThreadAnswer({
        answerId,
      });

      broadcastToRoom(roomId, {
        type: "commentAnswerUpdated",
        status: "created",
      });

      res.status(200).json({
        threadAnswer,
      });
    } else {
      res.status(500).json({
        status: "KO",
        message: "Thread failed to update",
      });
    }
  };
};

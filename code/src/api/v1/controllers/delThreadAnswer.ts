// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getThread } from "../../../database/controllers/thread.js";
import {
  deleteThreadAnswer,
  getThreadAnswer,
} from "../../../database/controllers/thread-answer.js";
import { broadcastToRoom } from "../../../comm-bus/comm-bus.js";

export const delThreadAnswerController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const answerId = req.params.answerId as string;

    const userId: string = req.session!.user.id;

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
      threadId: threadAnswer.threadId,
    });

    if (thread?.roomId !== roomId) {
      res
        .status(404)
        .json({ status: "KO", message: "Thread doesn't belong to this room" });
      return;
    }

    if (threadAnswer.userId !== userId) {
      res
        .status(403)
        .json({ status: "KO", message: "Thread answer doesn't belong to this user" });
      return;
    }

    const deleted = await deleteThreadAnswer({
      answerId,
    });

    if (deleted === 1) {
      broadcastToRoom(roomId, {
        type: "commentAnswerDeleted",
        status: "deleted",
      });

      res.status(200).json({ status: "OK", message: "Thread answer deleted" });
      return;
    } else {
      res
        .status(500)
        .json({ status: "KO", message: "Thread answer failed to delete" });
    }
  };
};

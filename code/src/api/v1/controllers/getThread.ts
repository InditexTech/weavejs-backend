// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getThread } from "../../../database/controllers/thread.js";
import { getThreadAnswers } from "../../../database/controllers/thread-answer.js";

export const getThreadController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    const threadId = req.params.threadId;

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

    const threadAnswers = await getThreadAnswers(
      {
        threadId,
      },
      {
        limit: 20,
        offset: 0,
      }
    );

    res.status(200).json({
      thread,
      answers: threadAnswers,
      total: threadAnswers.length,
    });
  };
};

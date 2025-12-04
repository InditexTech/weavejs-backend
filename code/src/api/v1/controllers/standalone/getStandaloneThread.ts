// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getThread } from "@/database/controllers/thread.js";
import { getThreadAnswers } from "@/database/controllers/thread-answer.js";

export const getStandaloneThreadController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const instanceId = req.params.instanceId;
    const imageId = req.params.imageId;
    const threadId = req.params.threadId;

    const thread = await getThread({
      threadId,
    });

    if (!thread) {
      res.status(404).json({ status: "KO", message: "Thread doesn't exist" });
      return;
    }

    const roomId = `standalone-${instanceId}-${imageId}`;

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

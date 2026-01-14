// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getThread } from "../../../database/controllers/thread.js";
import {
  getThreadAllAnswers,
  getThreadAnswers,
} from "../../../database/controllers/thread-answer.js";

export const getThreadAnswersController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const threadId = req.params.threadId as string;
    const paginated: boolean = (req.query.paginated as string) === "true";

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

    if (!paginated) {
      const threadAnswers = await getThreadAllAnswers({
        threadId,
      });

      res
        .status(200)
        .json({ items: threadAnswers, total: threadAnswers.length });
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
      items: threadAnswers,
      total: threadAnswers.length,
    });
  };
};

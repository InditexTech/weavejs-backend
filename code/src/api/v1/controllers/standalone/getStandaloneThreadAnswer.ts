// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getThread } from "@/database/controllers/thread.js";
import { getThreadAnswer } from "@/database/controllers/thread-answer.js";

export const getStandaloneThreadAnswerController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const instanceId = req.params.instanceId as string;
    const imageId = req.params.imageId as string;
    const answerId = req.params.answerId as string;

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

    const roomId = `standalone-${instanceId}-${imageId}`;

    if (thread?.roomId !== roomId) {
      res
        .status(404)
        .json({ status: "KO", message: "Thread doesn't belong to this room" });
      return;
    }

    res.status(200).json({
      answer: threadAnswer,
    });
  };
};

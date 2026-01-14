// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { getThread } from "../../../database/controllers/thread.js";
import { createThreadAnswer } from "../../../database/controllers/thread-answer.js";
import { broadcastToRoom } from "../../../comm-bus/comm-bus.js";

export const postThreadAnswerController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const threadId = req.params.threadId as string;

    const { userMetadata, content } = req.body;

    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";
    const clientId: string = (req.headers["x-weave-client-id"] as string) ?? "";

    if (
      !clientId ||
      clientId === "" ||
      !userId ||
      userId === "" ||
      !userMetadata ||
      !content
    ) {
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

    const answer = await createThreadAnswer({
      answerId: uuidv4(),
      threadId,
      userId,
      userMetadata,
      content,
    });

    broadcastToRoom(roomId, {
      type: "commentAnswerCreated",
      status: "created",
    });

    res.status(201).json({
      answer,
    });
  };
};

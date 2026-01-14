// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { createThread } from "@/database/controllers/thread.js";

export const postStandaloneThreadController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const instanceId = req.params.instanceId as string;
    const imageId = req.params.imageId as string;

    const { userMetadata, x, y, content } = req.body;

    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";

    if (!userId || userId === "" || !userMetadata || !x || !y || !content) {
      res.status(400).json({
        status: "KO",
        message: "Missing required fields",
      });
      return;
    }

    const roomId = `standalone-${instanceId}-${imageId}`;

    const thread = await createThread({
      threadId: uuidv4(),
      roomId,
      userId,
      userMetadata,
      x: parseFloat(x),
      y: parseFloat(y),
      status: "pending",
      content,
      replies: 0,
    });

    res.status(201).json({
      thread,
      answers: [],
      total: 0,
    });
  };
};

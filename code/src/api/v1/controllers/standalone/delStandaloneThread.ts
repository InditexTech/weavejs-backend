// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { deleteThread, getThread } from "@/database/controllers/thread.js";

export const delStandaloneThreadController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const instanceId = req.params.instanceId as string;
    const imageId = req.params.imageId as string;
    const threadId = req.params.threadId as string;

    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";

    if (!userId || userId === "") {
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

    const roomId = `standalone-${instanceId}-${imageId}`;

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

    const deleted = await deleteThread({
      threadId,
    });

    if (deleted === 1) {
      res.status(200).json({ status: "OK", message: "Thread deleted" });
      return;
    } else {
      res
        .status(500)
        .json({ status: "KO", message: "Thread failed to delete" });
    }
  };
};

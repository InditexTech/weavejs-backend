// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import { createThread } from "../../../database/controllers/thread.js";
import { notifyRoomClients } from "../../v2/controllers/getServerSideEvents.js";

export const postThreadController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;

    const { userMetadata, x, y, content } = req.body;

    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";
    const clientId: string = (req.headers["x-weave-client-id"] as string) ?? "";

    if (
      !clientId ||
      clientId === "" ||
      !userId ||
      userId === "" ||
      !userMetadata ||
      !x ||
      !y ||
      !content
    ) {
      res.status(400).json({
        status: "KO",
        message: "Missing required fields",
      });
      return;
    }

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

    notifyRoomClients(roomId, {
      type: "commentCreated",
      status: "created",
    });

    res.status(201).json({
      thread,
      answers: [],
      total: 0,
    });
  };
};

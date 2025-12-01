// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { createChat, getChat } from "../../../database/controllers/chat.js";

export const postChatController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;

    const { chatId, status, title } = req.body;

    const resourceId: string = (req.headers["x-weave-user-id"] as string) ?? "";

    if (!resourceId || resourceId === "" || !chatId || !status || !title) {
      res.status(400).json({
        status: "KO",
        message: "Missing required fields",
      });
      return;
    }

    const existingChat = await getChat({
      roomId,
      chatId,
      resourceId,
    });

    if (existingChat) {
      res.status(409).json({ status: "KO", message: "Chat already exists" });
      return;
    }

    const chat = await createChat({
      chatId,
      roomId,
      resourceId,
      status,
      title,
    });

    res.status(201).json({
      chat,
      messages: [],
    });
  };
};

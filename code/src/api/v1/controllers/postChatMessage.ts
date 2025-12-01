// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import { Request, Response } from "express";
import { createChatMessage } from "../../../database/controllers/chat-message.js";
import { getChat } from "../../../database/controllers/chat.js";

export const postChatMessageController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    const chatId = req.params.chatId;

    const { messages } = req.body;

    const resourceId: string = (req.headers["x-weave-user-id"] as string) ?? "";

    if (!resourceId || resourceId === "" || !messages) {
      res.status(400).json({
        status: "KO",
        message: "Missing required fields",
      });
      return;
    }

    const chat = await getChat({
      roomId,
      chatId,
      resourceId,
    });

    if (!chat) {
      res.status(404).json({ status: "KO", message: "Chat doesn't exist" });
      return;
    }

    const createdMessages = [];
    for (const msg of messages) {
      if (!msg.id || !msg.role || !msg.parts) {
        console.error("Invalid message format", JSON.stringify(msg, null, 2));
        continue;
      }

      const message = await createChatMessage({
        id: uuidv4(),
        chatId,
        messageId: msg.id,
        role: msg.role,
        parts: msg.parts,
      });

      createdMessages.push(message);
    }

    res.status(201).json({
      messages: createdMessages,
    });
  };
};

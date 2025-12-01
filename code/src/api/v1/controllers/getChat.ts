// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getChat } from "../../../database/controllers/chat.js";
import {
  getChatMessages,
  getChatMessagesTotal,
} from "../../../database/controllers/chat-message.js";

export const getChatController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    const chatId = req.params.chatId;

    const resourceId: string =
      (req.headers["x-weave-user-id"] as string) ?? "undefined";

    const chat = await getChat({
      roomId,
      chatId,
      resourceId,
    });

    if (!chat) {
      res.status(404).json({ status: "KO", message: "Chat doesn't exist" });
      return;
    }

    if (chat.roomId !== roomId) {
      res
        .status(404)
        .json({ status: "KO", message: "Chat doesn't belong to this room" });
      return;
    }

    const chatMessages = await getChatMessages(
      {
        chatId,
      },
      {
        limit: 50,
        offset: 0,
      }
    );

    const chatMessagesTotal = await getChatMessagesTotal({
      chatId,
    });

    res.status(200).json({
      chat,
      messages: chatMessages,
      total: chatMessagesTotal,
    });
  };
};

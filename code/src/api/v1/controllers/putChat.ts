// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getChat, updateChat } from "../../../database/controllers/chat.js";

export const putChatController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    const chatId = req.params.chatId;

    const resourceId: string = (req.headers["x-weave-user-id"] as string) ?? "";

    if (!resourceId) {
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

    if (chat.roomId !== roomId) {
      res
        .status(404)
        .json({ status: "KO", message: "Chat doesn't belong to this room" });
      return;
    }

    if (chat.resourceId !== resourceId) {
      res
        .status(404)
        .json({ status: "KO", message: "Chat doesn't belong to this user" });
      return;
    }

    let updated = 0;

    if (Object.keys(req.body).length === 0) {
      chat.changed("updatedAt", true); // force mark as changed
      await chat.save();
      updated = 1;
    } else {
      updated = await updateChat(
        {
          roomId,
          chatId,
          resourceId,
        },
        { ...req.body, updatedAt: new Date() }
      );
    }

    if (updated === 1) {
      const chat = await getChat({
        roomId,
        chatId,
        resourceId,
      });

      res.status(200).json({
        chat,
      });
    } else {
      res.status(500).json({
        status: "KO",
        message: "Chat failed to update",
      });
    }
  };
};

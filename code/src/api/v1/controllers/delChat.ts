// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { deleteChat, getChat } from "../../../database/controllers/chat.js";

export const delChatController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    const chatId = req.params.chatId;

    const resourceId: string = (req.headers["x-weave-user-id"] as string) ?? "";

    if (!resourceId || resourceId === "") {
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

    const deleted = await deleteChat({
      roomId,
      chatId,
      resourceId,
    });

    if (deleted === 1) {
      res.status(200).json({ status: "OK", message: "Chat deleted" });
    } else {
      res.status(500).json({ status: "KO", message: "Chat failed to delete" });
    }
  };
};

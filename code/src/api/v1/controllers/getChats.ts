// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import {
  getRoomResourceChats,
  getRoomResourcesTotalChats,
} from "../../../database/controllers/chat.js";

export const getChatsController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    const limit: string = (req.query.limit as string) ?? "50";
    const offset: string = (req.query.offset as string) ?? "0";

    const resourceId: string =
      (req.headers["x-weave-user-id"] as string) ?? "undefined";

    if (!resourceId || resourceId === "undefined") {
      res.status(400).json({ error: "Missing or invalid resourceId" });
      return;
    }

    const total = await getRoomResourcesTotalChats({
      roomId,
      resourceId,
      status: "active",
    });

    const chats = await getRoomResourceChats(
      {
        roomId,
        resourceId,
        status: "active",
      },
      {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      }
    );

    res.status(200).json({ chats, limit, offset, total });
  };
};

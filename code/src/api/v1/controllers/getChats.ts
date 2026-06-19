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
    const roomId = req.params.roomId as string;
    const limit: string = (req.query.limit as string) ?? "50";
    const offset: string = (req.query.offset as string) ?? "0";

    const resourceId: string = req.session!.user.id;

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
        limit: Number.parseInt(limit, 10),
        offset: Number.parseInt(offset, 10),
      }
    );

    res.status(200).json({ chats, limit, offset, total });
  };
};

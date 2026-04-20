// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import {
  getRoomPages,
  getTotalRoomPages,
} from "@/database/controllers/page.js";

export const getPagesController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const limit: string = (req.query.limit as string) ?? "20";
    const offset: string = (req.query.offset as string) ?? "0";
    let status: string | undefined = undefined;
    if (req.query.status) {
      status = req.query.status as string;
    }

    const total = await getTotalRoomPages({
      roomId,
      status,
    });

    const roomVideos = await getRoomPages(
      {
        roomId,
        status,
      },
      {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      },
    );

    res.status(200).json({ items: roomVideos, total });
  };
};

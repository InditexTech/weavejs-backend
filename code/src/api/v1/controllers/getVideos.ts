// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import {
  getRoomVideos,
  getTotalRoomVideos,
} from "../../../database/controllers/video.js";

export const getVideosController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const since: string | null = (req.query.since as string) ?? null;
    const limit: string = (req.query.limit as string) ?? "20";
    const offset: string = (req.query.offset as string) ?? "0";

    const total = await getTotalRoomVideos({
      roomId,
      since: since ? new Date(since) : undefined,
    });

    const roomVideos = await getRoomVideos(
      {
        roomId,
        since: since ? new Date(since) : undefined,
      },
      {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      }
    );

    res.status(200).json({ items: roomVideos, total });
  };
};

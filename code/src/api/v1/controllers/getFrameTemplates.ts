// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import {
  getRoomFrameTemplates,
  getTotalRoomFrameTemplates,
} from "../../../database/controllers/template.js";

export const getFrameTemplatesController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    const since: string | null = (req.query.since as string) ?? null;

    const total = await getTotalRoomFrameTemplates({
      roomId,
      since: since ? new Date(since) : undefined,
    });

    const roomTemplates = await getRoomFrameTemplates({
      roomId,
      since: since ? new Date(since) : undefined,
    });

    res.status(200).json({ items: roomTemplates, total });
  };
};

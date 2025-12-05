// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import {
  getRoomAllThreads,
  getRoomThreads,
  getTotalRoomThreads,
} from "@/database/controllers/thread.js";
import { ThreadStatus } from "@/database/models/thread.js";

export const getStandaloneThreadsController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const instanceId = req.params.instanceId;
    const imageId = req.params.imageId;
    const roomId = `standalone-${instanceId}-${imageId}`;
    const status: ThreadStatus | "all" =
      (req.query.status as ThreadStatus | "all") ?? "pending";
    const paginated: boolean = (req.query.paginated as string) === "true";
    const limit: string = (req.query.limit as string) ?? "20";
    const offset: string = (req.query.offset as string) ?? "0";

    if (!paginated) {
      const threads = await getRoomAllThreads({
        roomId,
        status,
      });

      res.status(200).json({ items: threads, total: threads.length });
      return;
    }

    const total = await getTotalRoomThreads({
      roomId,
      status,
    });

    const roomThreads = await getRoomThreads(
      {
        roomId,
        status,
      },
      {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      }
    );

    res.status(200).json({ items: roomThreads, total });
  };
};

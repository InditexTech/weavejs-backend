// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getTasksRoomAndUser } from "../../../database/controllers/task.js";

export const getTasksController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const userId = req.session!.user.id;
    const limit: string = (req.query.limit as string) ?? "20";
    const offset: string = (req.query.offset as string) ?? "0";

    const userTasks = await getTasksRoomAndUser(
      {
        roomId,
        userId,
      },
      {
        limit: parseInt(limit, 10),
        offset: parseInt(offset, 10),
      }
    );

    res.status(200).json({ items: userTasks, total: userTasks.length });
  };
};

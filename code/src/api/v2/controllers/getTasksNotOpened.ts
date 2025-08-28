// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getTasksRoomAndUserNotOpened } from "../../../database/controllers/task.js";

export const getTasksNotOpenedController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;

    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";

    if (!userId || userId === "") {
      res.status(400).json({
        status: "KO",
        message: "Missing required parameters",
      });
      return;
    }

    const userTasks = await getTasksRoomAndUserNotOpened({
      roomId,
      userId,
    });

    res.status(200).json({ items: userTasks, total: userTasks.length });
  };
};

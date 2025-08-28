// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getTask, updateTask } from "../../../database/controllers/task.js";

export const putTaskController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";

    const { jobId, opened } = req.body;

    if (!userId || userId === "" || !jobId || jobId === "") {
      res.status(400).json({
        status: "KO",
        message: "Missing required parameters",
      });
      return;
    }

    const updated = await updateTask(
      {
        jobId,
      },
      {
        opened,
      }
    );

    if (updated === 1) {
      const taskModel = await getTask({
        jobId,
      });

      if (taskModel) {
        const taskJson = taskModel.toJSON();
        res.status(200).json(taskJson);
      } else {
        res.status(404).json({
          status: "KO",
          message: "Task not found",
        });
      }
    } else {
      res.status(500).json({
        status: "KO",
        message: "Task not updated",
      });
    }
  };
};

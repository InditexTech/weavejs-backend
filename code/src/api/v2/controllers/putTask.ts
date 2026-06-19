// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getTask, updateTask } from "../../../database/controllers/task.js";

export const putTaskController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const userId = req.session!.user.id;
    const roomId = req.params.roomId as string;
    const jobId = req.params.taskId as string;
    const { opened } = req.body;

    if (!jobId || jobId === "") {
      res.status(400).json({
        status: "KO",
        message: "Missing required parameters",
      });
      return;
    }

    const existingTask = await getTask({ jobId, roomId });

    if (!existingTask || existingTask.toJSON().userId !== userId) {
      res.status(404).json({
        status: "KO",
        message: "Task not found",
      });
      return;
    }

    const updated = await updateTask(
      {
        jobId,
        roomId,
      },
      {
        opened,
      }
    );

    if (updated === 1) {
      const taskModel = await getTask({
        jobId,
        roomId,
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

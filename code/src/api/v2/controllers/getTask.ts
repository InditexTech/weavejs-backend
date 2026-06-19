// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getTask } from "../../../database/controllers/task.js";
import { getWorkloadsInstance } from "../../../workloads/workloads.js";
import { JOB_REMOVE_IMAGE_BACKGROUND_QUEUE_NAME } from "../../../workloads/jobs/remove-image-background/constants.js";

const TASK_TYPE_QUEUE_MAP: Record<string, string> = {
  ["removeImageBackground"]: JOB_REMOVE_IMAGE_BACKGROUND_QUEUE_NAME,
};

export const getTaskController = () => {
  const boss = getWorkloadsInstance();

  return async (req: Request, res: Response): Promise<void> => {
    const jobId = req.params.taskId as string;
    const roomId = req.params.roomId as string;
    const userId = req.session!.user.id;

    const task = await getTask({
      jobId,
      roomId,
    });

    if (task) {
      const taskJson = task.toJSON();

      if (taskJson.userId !== userId) {
        res.status(404).json({
          status: "KO",
          message: "Task not found",
        });
        return;
      }

      const queue = TASK_TYPE_QUEUE_MAP[taskJson.type];
      const realTask = await boss?.getJobById(queue, jobId);

      if (realTask) {
        res.status(200).json({ task: taskJson });
        return;
      }
    }

    res.status(404).json({
      status: "KO",
      message: "Task not found",
    });
  };
};

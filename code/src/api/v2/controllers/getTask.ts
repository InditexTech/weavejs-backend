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
    const jobId = req.params.taskId;

    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";

    if (!userId || userId === "") {
      res.status(400).json({
        status: "KO",
        message: "Missing required parameters",
      });
      return;
    }

    const task = await getTask({
      jobId,
    });

    if (task) {
      const taskJson = task.toJSON();
      const queue = TASK_TYPE_QUEUE_MAP[taskJson.type];

      const realTask = await boss?.getJobById(queue, jobId);

      if (realTask) {
        res.status(200).json({ task: taskJson, internal: realTask });
        return;
      }
    }

    res.status(404).json({
      status: "KO",
      message: "Task not found",
    });
  };
};

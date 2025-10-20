// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { JOB_HANDLERS } from "../../../workloads/constants.js";
import { DeleteVideoJob } from "../../../workloads/jobs/delete-video/job.js";
import { getJobHandler } from "../../../workloads/workloads.js";

export const delVideoController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    const videoId = req.params.videoId;

    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";
    const clientId: string = (req.headers["x-weave-client-id"] as string) ?? "";

    if (!clientId || clientId === "" || !userId || userId === "") {
      res.status(400).json({
        status: "KO",
        message: "Missing required fields",
      });
      return;
    }

    const jobHandler = getJobHandler<DeleteVideoJob>(JOB_HANDLERS.DELETE_VIDEO);

    const id = await jobHandler.startDeleteVideoJob(
      clientId,
      roomId,
      userId,
      videoId
    );

    if (id) {
      res.status(200).json({
        status: "Delete video job created OK",
        jobId: id,
      });
    } else {
      res.status(500).json({
        status: "KO",
        message: "Error creating delete video job",
      });
    }
  };
};

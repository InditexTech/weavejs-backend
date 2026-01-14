// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getJobHandler } from "../../../workloads/workloads.js";
import { DeleteImageJob } from "../../../workloads/jobs/delete-image/job.js";
import { JOB_HANDLERS } from "../../../workloads/constants.js";

export const delImageController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const imageId = req.params.imageId as string;

    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";
    const clientId: string = (req.headers["x-weave-client-id"] as string) ?? "";

    if (!clientId || clientId === "" || !userId || userId === "") {
      res.status(400).json({
        status: "KO",
        message: "Missing required fields",
      });
      return;
    }

    const jobHandler = getJobHandler<DeleteImageJob>(JOB_HANDLERS.DELETE_IMAGE);

    const id = await jobHandler.startDeleteImageJob(
      clientId,
      roomId,
      userId,
      imageId
    );

    if (id) {
      res.status(200).json({
        status: "Delete image job created OK",
        jobId: id,
      });
    } else {
      res.status(500).json({
        status: "KO",
        message: "Error creating delete image job",
      });
    }
  };
};

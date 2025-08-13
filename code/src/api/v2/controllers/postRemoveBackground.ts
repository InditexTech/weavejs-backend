// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getJobHandler } from "../../../workloads/workloads.js";
import { JOB_HANDLERS } from "../../../workloads/constants.js";
import { RemoveImageBackgroundJob } from "../../../workloads/jobs/remove-image-background/job.js";

export const postRemoveBackgroundController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    const imageId = req.params.imageId;
    const {
      image: { dataBase64, contentType },
    } = req.body;

    const userId: string = req.headers["x-weave-user-id"] ?? "";
    const clientId: string = req.headers["x-weave-client-id"] ?? "";

    if (
      !clientId ||
      clientId === "" ||
      !userId ||
      userId === "" ||
      !roomId ||
      !imageId ||
      !dataBase64 ||
      !contentType
    ) {
      res.status(400).json({
        status: "KO",
        message: "Missing required fields",
      });
      return;
    }

    const jobHandler = getJobHandler<RemoveImageBackgroundJob>(
      JOB_HANDLERS.REMOVE_IMAGE_BACKGROUND
    );

    const id = await jobHandler.startRemoveImageBackgroundJob(
      clientId,
      roomId,
      userId,
      imageId,
      {
        dataBase64,
        contentType,
      }
    );

    if (id) {
      res.status(200).json({
        status: "Image background removal job created OK",
        jobId: id,
      });
    } else {
      res.status(500).json({
        status: "KO",
        message: "Error creating image background removal job",
      });
    }
  };
};

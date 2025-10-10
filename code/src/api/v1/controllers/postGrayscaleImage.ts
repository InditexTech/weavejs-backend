// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getJobHandler } from "../../../workloads/workloads.js";
import { JOB_HANDLERS } from "../../../workloads/constants.js";
import { GrayscaleImageJob } from "../../../workloads/jobs/grayscale-image/job.js";

export const postGrayscaleImageController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    const imageId = req.params.imageId;
    const {
      image: { replaceImage, dataBase64, contentType },
    } = req.body;

    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";
    const clientId: string = (req.headers["x-weave-client-id"] as string) ?? "";

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

    const jobHandler = getJobHandler<GrayscaleImageJob>(
      JOB_HANDLERS.GRAYSCALE_IMAGE
    );

    const id = await jobHandler.startGrayscaleImageJob(
      clientId,
      roomId,
      userId,
      imageId,
      {
        replaceImage,
        dataBase64,
        contentType,
      }
    );

    if (id) {
      res.status(200).json({
        status: "Grayscale image job created OK",
        jobId: id,
      });
    } else {
      res.status(500).json({
        status: "KO",
        message: "Grayscale creating negate image job",
      });
    }
  };
};

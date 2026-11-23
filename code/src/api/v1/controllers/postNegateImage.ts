// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getLogger } from "../../../logger/logger.js";
import { getJobHandler } from "../../../workloads/workloads.js";
import {
  decodeImageOrThrow,
  imagePayloadSchema,
  InvalidImageError,
} from "../../../images/validate.js";
import { JOB_HANDLERS } from "../../../workloads/constants.js";
import { NegateImageJob } from "../../../workloads/jobs/negate-image/job.js";

export const postNegateImageController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const imageId = req.params.imageId as string;

    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";
    const clientId: string = (req.headers["x-weave-client-id"] as string) ?? "";

    if (!clientId || !userId || !roomId || !imageId) {
      res.status(400).json({
        status: "KO",
        message: "Missing required fields",
      });
      return;
    }

    const parsedBody = imagePayloadSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ errors: parsedBody.error.issues });
      return;
    }

    const { replaceImage, dataBase64, contentType } = parsedBody.data.image;

    try {
      await decodeImageOrThrow(dataBase64);

      const jobHandler = getJobHandler<NegateImageJob>(JOB_HANDLERS.NEGATE_IMAGE);

      const id = await jobHandler.startNegateImageJob(
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
          status: "Negate image job created OK",
          jobId: id,
        });
      } else {
        res.status(500).json({
          status: "KO",
          message: "Error creating negate image job",
        });
      }
    } catch (ex) {
      if (ex instanceof InvalidImageError) {
        res.status(400).json({ status: "KO", message: ex.message });
        return;
      }
      getLogger()
        .child({ module: "negate-image-controller" })
        .error({ err: ex }, "Error creating negate image job");
      res.status(500).json({
        status: "KO",
        message: "Error creating negate image job",
      });
    }
  };
};

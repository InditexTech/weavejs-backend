// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getLogger } from "../../../logger/logger.js";
import {
  decodeImageOrThrow,
  imagePayloadSchema,
  InvalidImageError,
} from "../../../images/validate.js";
import { getJobHandler } from "../../../workloads/workloads.js";
import { JOB_HANDLERS } from "../../../workloads/constants.js";
import { RemoveImageBackgroundJob } from "../../../workloads/jobs/remove-image-background/job.js";

export const postRemoveBackgroundController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const imageId = req.params.imageId as string;

    const userId = req.session!.user.id;
    const clientId: string = (req.headers["x-weave-client-id"] as string) ?? "";

    if (!clientId || !roomId || !imageId) {
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

    if (!contentType) {
      res.status(400).json({
        status: "KO",
        message: "Missing required fields",
      });
      return;
    }

    try {
      await decodeImageOrThrow(dataBase64);

      const jobHandler = getJobHandler<RemoveImageBackgroundJob>(
        JOB_HANDLERS.REMOVE_IMAGE_BACKGROUND,
      );

      const id = await jobHandler.startRemoveImageBackgroundJob(
        clientId,
        roomId,
        userId,
        imageId,
        {
          replaceImage,
          dataBase64,
          contentType,
        },
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
    } catch (ex) {
      if (ex instanceof InvalidImageError) {
        res.status(400).json({ status: "KO", message: ex.message });
        return;
      }
      getLogger()
        .child({ module: "remove-background-controller" })
        .error({ err: ex }, "Error creating image background removal job");
      res.status(500).json({
        status: "KO",
        message: "Error creating image background removal job",
      });
    }
  };
};

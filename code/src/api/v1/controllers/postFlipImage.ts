// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { Request, Response } from "express";
import { getJobHandler } from "../../../workloads/workloads.js";
import { JOB_HANDLERS } from "../../../workloads/constants.js";
import { FlipImageJob } from "../../../workloads/jobs/flip-image/job.js";
import { FlipOrientation } from "../../../workloads/jobs/flip-image/types.js";

const IMAGE_BASE64_MAX = 15 * 1024 * 1024; // 15 MB of base64 chars ≈ ~11 MB decoded

const payloadSchema = z.object({
  image: z.object({
    replaceImage: z.string().optional(),
    dataBase64: z.string().max(IMAGE_BASE64_MAX),
    contentType: z.string().max(100),
  }),
});

export const postFlipImageController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const imageId = req.params.imageId as string;
    const orientation: FlipOrientation = req.params
      .orientation as FlipOrientation;

    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";
    const clientId: string = (req.headers["x-weave-client-id"] as string) ?? "";

    if (["horizontal", "vertical"].indexOf(orientation) === -1) {
      res.status(400).json({
        status: "KO",
        message: "Invalid orientation value",
      });
      return;
    }

    if (!clientId || !userId || !roomId || !imageId) {
      res.status(400).json({
        status: "KO",
        message: "Missing required fields",
      });
      return;
    }

    const parsedBody = payloadSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ errors: parsedBody.error.issues });
      return;
    }

    const { replaceImage, dataBase64, contentType } = parsedBody.data.image;

    const jobHandler = getJobHandler<FlipImageJob>(JOB_HANDLERS.FLIP_IMAGE);

    const id = await jobHandler.startFlipImageJob(
      clientId,
      roomId,
      userId,
      imageId,
      orientation,
      {
        replaceImage,
        dataBase64,
        contentType,
      },
    );

    if (id) {
      res.status(200).json({
        status: "Flip image job created OK",
        jobId: id,
      });
    } else {
      res.status(500).json({
        status: "KO",
        message: "Error creating flip image job",
      });
    }
  };
};

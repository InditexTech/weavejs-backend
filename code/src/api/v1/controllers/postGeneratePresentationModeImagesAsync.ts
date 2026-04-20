// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { Request, Response } from "express";
import { getJobHandler } from "@/workloads/workloads.js";
import { JOB_HANDLERS } from "@/workloads/constants.js";
import { PresentationModeImagesJob } from "@/workloads/jobs/presentation-mode-images/job.js";

const payloadSchema = z.object({
  roomId: z.string(),
  type: z.enum(["area"]),
  area: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  options: z.object({
    padding: z.number().min(0).optional().default(20),
    pixelRatio: z.number().min(1).optional().default(1),
  }),
});

export const postGeneratePresentationModeImagesAsyncController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;

    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";
    const clientId: string = (req.headers["x-weave-client-id"] as string) ?? "";

    const parsedBody = payloadSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({ errors: parsedBody.error.issues });
      return;
    }

    const jobHandler = getJobHandler<PresentationModeImagesJob>(
      JOB_HANDLERS.PRESENTATION_MODE_IMAGES,
    );

    const { jobId: id, presentationModeId } =
      await jobHandler.startPresentationModeImagesJob(
        clientId,
        roomId,
        userId,
        parsedBody.data,
      );

    if (id) {
      res.status(200).json({
        status: "Generate presentation mode images job created OK",
        jobId: id,
        presentationModeId,
      });
    } else {
      res.status(500).json({
        status: "KO",
        message: "Error creating presentation mode images job",
      });
    }
  };
};

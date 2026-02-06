// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { Request, Response } from "express";
import { WeaveExportFormats } from "@inditextech/weave-types";
import { ExportImageJob } from "@/workloads/jobs/export-image/job.js";
import { getJobHandler } from "@/workloads/workloads.js";
import { JOB_HANDLERS } from "@/workloads/constants.js";

const WeaveExportFormatsSchema: z.ZodType<WeaveExportFormats> = z.enum([
  "image/png",
  "image/jpeg",
]);

const payloadSchema = z.object({
  roomData: z.string().base64(),
  nodes: z.array(z.string()).optional().default([]),
  options: z.object({
    format: WeaveExportFormatsSchema.optional().default("image/png"),
    backgroundColor: z.string().optional().default("transparent"),
    padding: z.number().min(0).optional().default(20),
    pixelRatio: z.number().min(1).optional().default(1),
    quality: z.number().min(0).max(1).optional().default(1),
  }),
  responseType: z.enum(["base64", "blob", "zip"]).optional().default("blob"),
});

export const postExportToImageAsyncController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;

    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";
    const clientId: string = (req.headers["x-weave-client-id"] as string) ?? "";

    const parsedBody = payloadSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({ errors: parsedBody.error.errors });
      return;
    }

    const jobHandler = getJobHandler<ExportImageJob>(JOB_HANDLERS.EXPORT_IMAGE);

    const id = await jobHandler.startExportImageJob(
      clientId,
      roomId,
      userId,
      parsedBody.data,
    );

    if (id) {
      res.status(200).json({
        status: "Export image job created OK",
        jobId: id,
      });
    } else {
      res.status(500).json({
        status: "KO",
        message: "Error creating export image job",
      });
    }
  };
};

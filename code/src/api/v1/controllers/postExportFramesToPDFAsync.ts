// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { Request, Response } from "express";
import { getJobHandler } from "@/workloads/workloads.js";
import { JOB_HANDLERS } from "@/workloads/constants.js";
import { ExportFramesToPdfJob } from "@/workloads/jobs/export-frame-pdf/job.js";

const payloadSchema = z.object({
  roomData: z.string().base64(),
  pages: z
    .array(z.object({ title: z.string(), nodes: z.array(z.string()) }))
    .optional()
    .default([]),
  options: z.object({
    backgroundColor: z.string().optional().default("transparent"),
    padding: z.number().min(0).optional().default(20),
    pixelRatio: z.number().min(1).optional().default(1),
  }),
  responseType: z.enum(["base64", "blob", "zip"]).optional().default("blob"),
});

export const postExportFramesToPDFAsyncController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;

    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";
    const clientId: string = (req.headers["x-weave-client-id"] as string) ?? "";

    const parsedBody = payloadSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({ errors: parsedBody.error.issues });
      return;
    }

    const jobHandler = getJobHandler<ExportFramesToPdfJob>(
      JOB_HANDLERS.EXPORT_FRAMES_TO_PDF,
    );

    const id = await jobHandler.startExportFramesToPdfJob(
      clientId,
      roomId,
      userId,
      parsedBody.data,
    );

    if (id) {
      res.status(200).json({
        status: "Export frames to pdf job created OK",
        jobId: id,
      });
    } else {
      res.status(500).json({
        status: "KO",
        message: "Error creating export frames to pdf job",
      });
    }
  };
};

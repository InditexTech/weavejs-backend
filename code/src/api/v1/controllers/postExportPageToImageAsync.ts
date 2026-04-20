// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { Request, Response } from "express";
import { WeaveExportFormats } from "@inditextech/weave-types";
import { ExportPageToImageJob } from "@/workloads/jobs/export-page-image/job.js";
import { getJobHandler } from "@/workloads/workloads.js";
import { JOB_HANDLERS } from "@/workloads/constants.js";

const WeaveExportFormatsSchema: z.ZodType<WeaveExportFormats> = z.enum([
  "image/png",
  "image/jpeg",
]);

const payloadSchema = z.discriminatedUnion("type", [
  z.object({
    roomData: z.string().base64(),
    type: z.literal("nodes"),
    nodes: z.array(z.string()),
    options: z.object({
      format: WeaveExportFormatsSchema.optional().default("image/png"),
      backgroundColor: z.string().optional().default("transparent"),
      padding: z.number().min(0).optional().default(20),
      pixelRatio: z.number().min(1).optional().default(1),
      quality: z.number().min(0).max(1).optional().default(1),
    }),
    responseType: z.enum(["base64", "blob", "zip"]).optional().default("blob"),
  }),
  z.object({
    roomData: z.string().base64(),
    type: z.literal("area"),
    area: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    }),
    options: z.object({
      format: WeaveExportFormatsSchema.optional().default("image/png"),
      backgroundColor: z.string().optional().default("transparent"),
      padding: z.number().min(0).optional().default(20),
      pixelRatio: z.number().min(1).optional().default(1),
      quality: z.number().min(0).max(1).optional().default(1),
    }),
    responseType: z.enum(["base64", "blob", "zip"]).optional().default("blob"),
  }),
]);

export const postExportPageToImageAsyncController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;

    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";
    const clientId: string = (req.headers["x-weave-client-id"] as string) ?? "";

    const parsedBody = payloadSchema.safeParse(req.body);

    if (!parsedBody.success) {
      res.status(400).json({ errors: parsedBody.error.issues });
      return;
    }

    const jobHandler = getJobHandler<ExportPageToImageJob>(
      JOB_HANDLERS.EXPORT_PAGE_TO_IMAGE,
    );

    const id = await jobHandler.startExportPageToImageJob(
      clientId,
      roomId,
      userId,
      parsedBody.data,
    );

    if (id) {
      res.status(200).json({
        status: "Export page to image job created OK",
        jobId: id,
      });
    } else {
      res.status(500).json({
        status: "KO",
        message: "Error creating export page to image job",
      });
    }
  };
};

// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { Request, Response } from "express";
import { getServiceConfig } from "../../../config/config.js";
import { verifyAIPassword } from "../../../lib/aiPassword.js";
import { GenerateImagesJob } from "../../../workloads/jobs/generate-images/job.js";
import { getJobHandler } from "../../../workloads/workloads.js";
import { JOB_HANDLERS } from "../../../workloads/constants.js";

const payloadSchema = z.object({
  prompt: z.string().max(4000),
  sample_count: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
  size: z.enum(["1024x1024", "1536x1024", "1024x1536"]),
  quality: z.enum(["low", "medium", "high"]),
  moderation: z.enum(["low", "auto"]),
  model: z
    .enum(["openai/gpt-image-1", "gemini-3.1-flash-image-preview"])
    .optional(),
});

export const postGenerateImageControllerV2 = () => {
  const config = getServiceConfig();

  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const password = req.headers["x-ai-password"];

    if (!verifyAIPassword(password, config.ai.password)) {
      res.status(401).json({ status: "KO", message: "Not enabled" });
      return;
    }

    const parsedBody = payloadSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ errors: parsedBody.error.issues });
      return;
    }

    const { prompt, sample_count, size, quality, moderation, model } =
      parsedBody.data;
    const modelToUse = model ?? "openai/gpt-image-1";

    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";
    const clientId: string = (req.headers["x-weave-client-id"] as string) ?? "";

    const jobHandler = getJobHandler<GenerateImagesJob>(
      JOB_HANDLERS.GENERATE_IMAGES
    );

    const id = await jobHandler.startGenerateImagesJob(
      clientId,
      roomId,
      userId,
      {
        model: modelToUse,
        prompt,
        sampleCount: sample_count,
        size,
        quality,
        moderation,
      }
    );

    if (id) {
      res.status(200).json({
        status: "Images generation job created OK",
        jobId: id,
      });
    } else {
      res.status(500).json({
        status: "KO",
        message: "Error creating images generation job",
      });
    }
  };
};

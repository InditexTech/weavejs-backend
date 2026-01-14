// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getServiceConfig } from "../../../config/config.js";
import { GenerateImagesJob } from "../../../workloads/jobs/generate-images/job.js";
import { getJobHandler } from "../../../workloads/workloads.js";
import { JOB_HANDLERS } from "../../../workloads/constants.js";

export const postGenerateImageControllerV2 = () => {
  const config = getServiceConfig();

  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const { model, prompt, sample_count, size, quality, moderation } = req.body;
    const password = req.query.password;

    const modelToUse = model ?? "openai/gpt-image-1";

    if (password !== config.ai.password) {
      res.status(401).json({ status: "KO", message: "Not enabled" });
      return;
    }

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

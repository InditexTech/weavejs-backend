// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { Request, Response } from "express";
import { getServiceConfig } from "../../../config/config.js";
import { verifyAIPassword } from "../../../lib/aiPassword.js";
import { EditImageJob } from "../../../workloads/jobs/edit-image/job.js";
import { getJobHandler } from "../../../workloads/workloads.js";
import { JOB_HANDLERS } from "../../../workloads/constants.js";
import { EditImageParameters } from "../../../workloads/jobs/edit-image/types.js";

const IMAGE_BASE64_MAX = 50 * 1024 * 1024; // 50 MB base64 chars

const payloadSchema = z.object({
  prompt: z.string().max(4000),
  sample_count: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
  ]),
  image: z.string().max(IMAGE_BASE64_MAX),
  reference_images: z
    .array(z.string().max(IMAGE_BASE64_MAX))
    .max(4)
    .optional(),
  imageMask: z.string().max(IMAGE_BASE64_MAX).optional(),
  size: z.enum(["1024x1024", "1536x1024", "1024x1536"]),
  quality: z.enum(["low", "medium", "high"]),
  moderation: z.enum(["low", "auto"]),
});

export const postEditImageControllerV2 = () => {
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

    const {
      sample_count,
      prompt,
      image,
      reference_images,
      imageMask,
      size,
      quality,
      moderation,
    } = parsedBody.data;

    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";
    const clientId: string = (req.headers["x-weave-client-id"] as string) ?? "";

    const jobHandler = getJobHandler<EditImageJob>(JOB_HANDLERS.EDIT_IMAGE);

    let editParams: EditImageParameters;
    if (imageMask) {
      editParams = {
        prompt,
        sampleCount: sample_count,
        size,
        quality,
        moderation,
        editKind: "editImageMask",
        image,
        imageMask,
      };
    } else if (reference_images && reference_images.length > 0) {
      editParams = {
        prompt,
        sampleCount: sample_count,
        size,
        quality,
        moderation,
        editKind: "editImageReferences",
        image,
        referenceImages: reference_images,
      };
    } else {
      editParams = {
        prompt,
        sampleCount: sample_count,
        size,
        quality,
        moderation,
        editKind: "editImage",
        image,
      };
    }

    const id = await jobHandler.startEditImageJob(
      clientId,
      roomId,
      userId,
      editParams,
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

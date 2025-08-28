// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getServiceConfig } from "../../../config/config.js";
import { EditImageJob } from "../../../workloads/jobs/edit-image/job.js";
import { getJobHandler } from "../../../workloads/workloads.js";
import { JOB_HANDLERS } from "../../../workloads/constants.js";
import { EditImageKind } from "../../../workloads/jobs/edit-image/types.js";

export const postEditImageControllerV2 = () => {
  const config = getServiceConfig();

  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;
    const {
      sample_count,
      prompt,
      image,
      reference_images,
      imageMask,
      size,
      quality,
      moderation,
    } = req.body;
    const password = req.query.password;

    if (password !== config.ai.password) {
      res.status(401).json({ status: "KO", message: "Not enabled" });
      return;
    }

    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";
    const clientId: string = (req.headers["x-weave-client-id"] as string) ?? "";

    if (Array.isArray(reference_images) && reference_images.length > 0) {
      const maxLength = 4;
      if (reference_images.length > maxLength) {
        res.status(500).json({
          status: "KO",
          message: "Maximum 4 reference images allowed",
        });
        return;
      }
    }

    const jobHandler = getJobHandler<EditImageJob>(JOB_HANDLERS.EDIT_IMAGE);

    let editKind: EditImageKind = "editImage";
    if (imageMask) {
      editKind = "editImageMask";
    }
    if (reference_images?.length > 0) {
      editKind = "editImageReferences";
    }

    const id = await jobHandler.startEditImageJob(clientId, roomId, userId, {
      prompt,
      sampleCount: sample_count,
      size,
      quality,
      moderation,
      editKind,
      image,
      imageMask,
      referenceImages: reference_images,
    });

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

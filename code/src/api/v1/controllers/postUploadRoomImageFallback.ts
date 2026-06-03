// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getRoomUser } from "@/database/controllers/room-user.js";
import { getPage } from "@/database/controllers/page.js";
import { getJobHandler } from "@/workloads/workloads.js";
import { EditFallbackImageJob } from "@/workloads/jobs/edit-fallback-image/job.js";
import { JOB_HANDLERS } from "@/workloads/constants.js";

export const postUploadRoomImageFallbackController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const pageId = req.params.pageId as string;
    const imageId = req.body.imageId as string;
    const dataURL = req.body.dataURL as string;

    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";
    const clientId: string = (req.headers["x-weave-client-id"] as string) ?? "";

    const page = await getPage({
      roomId,
      pageId,
    });

    if (!page) {
      res.status(404).json({ status: "KO", message: "Page not found" });
      return;
    }

    const roomUser = await getRoomUser({
      roomId,
      userId: req.session.user.id,
    });

    if (!roomUser) {
      res.status(403).json({ status: "KO", message: "User not in the room" });
      return;
    }

    const jobHandler = getJobHandler<EditFallbackImageJob>(
      JOB_HANDLERS.EDIT_FALLBACK_IMAGE,
    );

    const id = await jobHandler.startEditFallbackImageJob(
      clientId,
      roomId,
      userId,
      "add",
      imageId,
      dataURL,
    );

    if (id) {
      res.status(200).json({
        status: "Add Image Fallback job created OK",
        jobId: id,
      });
    } else {
      res.status(500).json({
        status: "KO",
        message: "Add Image Fallback removal job",
      });
    }
  };
};

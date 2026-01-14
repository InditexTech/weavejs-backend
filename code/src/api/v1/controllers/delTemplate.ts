// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getJobHandler } from "../../../workloads/workloads.js";
import { DeleteTemplateJob } from "../../../workloads/jobs/delete-template/job.js";
import { JOB_HANDLERS } from "../../../workloads/constants.js";

export const delTemplateController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const templateId = req.params.templateId as string;
    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";
    const clientId: string = (req.headers["x-weave-client-id"] as string) ?? "";

    if (!clientId || clientId === "" || !userId || userId === "") {
      res.status(400).json({
        status: "KO",
        message: "Missing required fields",
      });
      return;
    }

    const jobHandler = getJobHandler<DeleteTemplateJob>(
      JOB_HANDLERS.DELETE_TEMPLATE
    );

    const id = await jobHandler.startDeleteTemplateJob(
      clientId,
      roomId,
      userId,
      templateId
    );

    if (id) {
      res.status(200).json({
        status: "Delete template job created OK",
        jobId: id,
      });
    } else {
      res.status(500).json({
        status: "KO",
        message: "Error creating delete template job",
      });
    }
  };
};

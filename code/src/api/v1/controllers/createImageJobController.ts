// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getJobHandler } from "../../../workloads/workloads.js";
import {
  readValidatedImagePayload,
  respondImageJobError,
  type ImageJobPayload,
} from "../../../images/http.js";
import { JOB_HANDLERS } from "../../../workloads/constants.js";

type StartArgs = {
  clientId: string;
  roomId: string;
  userId: string;
  imageId: string;
  image: ImageJobPayload;
};

type ImageJobControllerOptions<J> = {
  handler: (typeof JOB_HANDLERS)[keyof typeof JOB_HANDLERS];
  label: string;
  module: string;
  start: (job: J, args: StartArgs) => Promise<string>;
};

export const createImageJobController = <J>({
  handler,
  label,
  module,
  start,
}: ImageJobControllerOptions<J>) => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const imageId = req.params.imageId as string;

    const userId: string = (req.headers["x-weave-user-id"] as string) ?? "";
    const clientId: string = (req.headers["x-weave-client-id"] as string) ?? "";

    if (!clientId || !userId || !roomId || !imageId) {
      res.status(400).json({
        status: "KO",
        message: "Missing required fields",
      });
      return;
    }

    const image = await readValidatedImagePayload(req.body, res);
    if (!image) {
      return;
    }

    try {
      const id = await start(getJobHandler<J>(handler), {
        clientId,
        roomId,
        userId,
        imageId,
        image,
      });

      if (id) {
        res.status(200).json({
          status: `${label} job created OK`,
          jobId: id,
        });
      } else {
        res.status(500).json({
          status: "KO",
          message: `Error creating ${label.toLowerCase()} job`,
        });
      }
    } catch (ex) {
      respondImageJobError(
        res,
        ex,
        module,
        `creating ${label.toLowerCase()} job`,
      );
    }
  };
};

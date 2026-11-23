// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { JOB_HANDLERS } from "../../../workloads/constants.js";
import { NegateImageJob } from "../../../workloads/jobs/negate-image/job.js";
import { createImageJobController } from "./createImageJobController.js";

export const postNegateImageController = () =>
  createImageJobController<NegateImageJob>({
    handler: JOB_HANDLERS.NEGATE_IMAGE,
    label: "Negate image",
    module: "negate-controller",
    start: (job, { clientId, roomId, userId, imageId, image }) =>
      job.startNegateImageJob(clientId, roomId, userId, imageId, image),
  });

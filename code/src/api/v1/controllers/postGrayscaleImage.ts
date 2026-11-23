// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { JOB_HANDLERS } from "../../../workloads/constants.js";
import { GrayscaleImageJob } from "../../../workloads/jobs/grayscale-image/job.js";
import { createImageJobController } from "./createImageJobController.js";

export const postGrayscaleImageController = () =>
  createImageJobController<GrayscaleImageJob>({
    handler: JOB_HANDLERS.GRAYSCALE_IMAGE,
    label: "Grayscale image",
    module: "grayscale-controller",
    start: (job, { clientId, roomId, userId, imageId, image }) =>
      job.startGrayscaleImageJob(clientId, roomId, userId, imageId, image),
  });

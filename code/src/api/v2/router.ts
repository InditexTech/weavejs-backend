// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Express, Router } from "express";
import multer from "multer";
import { getServiceConfig } from "../../config/config.js";
import { getCorsMiddleware } from "../../middlewares/cors.js";
import { postGenerateImageController } from "./controllers/postGenerateImage.js";
import { postEditImageController } from "./controllers/postEditImage.js";
import { postRemoveBackgroundController } from "./controllers/postRemoveBackground.js";
import { getTasksController } from "./controllers/getTasks.js";
import { getTasksNotOpenedController } from "./controllers/getTasksNotOpened.js";
import { getTaskController } from "./controllers/getTask.js";
import { getImagesController } from "./controllers/getImages.js";
import { getImageController } from "./controllers/getImage.js";
import { postUploadImageController } from "./controllers/postUploadImage.js";
import { delImageController } from "./controllers/delImage.js";

const router: Router = Router();

export function getApiV2Router() {
  return router;
}

export function setupApiV2Router(app: Express) {
  const config = getServiceConfig();

  const {
    pubsub: { hubName },
  } = config;

  const router: Router = Router();

  // Setup multer to upload files
  const upload = multer();

  // Setup cors
  const cors = getCorsMiddleware();

  router.post(
    `/${hubName}/rooms/:roomId/images/generate`,
    cors,
    postGenerateImageController()
  );
  router.post(
    `/${hubName}/rooms/:roomId/images/edit`,
    cors,
    postEditImageController()
  );
  router.get(`/${hubName}/rooms/:roomId/images`, cors, getImagesController());
  router.get(
    `/${hubName}/rooms/:roomId/images/:imageId`,
    cors,
    getImageController()
  );
  router.post(
    `/${hubName}/rooms/:roomId/images`,
    cors,
    upload.single("file"),
    postUploadImageController()
  );
  router.delete(
    `/${hubName}/rooms/:roomId/images/:imageId`,
    cors,
    delImageController()
  );
  router.post(
    `/${hubName}/rooms/:roomId/images/:imageId/remove-background`,
    cors,
    postRemoveBackgroundController()
  );

  if (config.features.workloads) {
    // Tasks API
    router.get(`/${hubName}/rooms/:roomId/tasks`, cors, getTasksController());
    router.get(
      `/${hubName}/rooms/:roomId/tasks/not-opened`,
      cors,
      getTasksNotOpenedController()
    );
    router.get(
      `/${hubName}/rooms/:roomId/tasks/:taskId`,
      cors,
      getTaskController()
    );
  }

  app.use("/api/v2", router);
}

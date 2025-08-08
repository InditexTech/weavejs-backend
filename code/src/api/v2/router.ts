// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Express, Router } from "express";
import { getServiceConfig } from "../../config/config.js";
import { getCorsMiddleware } from "../../middlewares/cors.js";
import { postGenerateImageController } from "./controllers/postGenerateImage.js";
import { postEditImageController } from "./controllers/postEditImage.js";
import { postRemoveBackgroundController } from "./controllers/postRemoveBackground.js";
import { getServerSideEvents } from "./controllers/getServerSideEvents.js";
import { getTasksController } from "./controllers/getTasks.js";

const router: Router = Router();

export function getApiV1Router() {
  return router;
}

export function setupApiV2Router(app: Express) {
  const config = getServiceConfig();

  const {
    pubsub: { hubName },
  } = config;

  const router: Router = Router();

  // Setup cors
  const cors = getCorsMiddleware();

  // Server-side events API
  router.get(`/${hubName}/rooms/:roomId/events`, cors, getServerSideEvents());

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
  router.post(
    `/${hubName}/rooms/:roomId/images/:imageId/remove-background`,
    cors,
    postRemoveBackgroundController()
  );

  // Tasks API
  router.get(`/${hubName}/rooms/:roomId/tasks`, cors, getTasksController());

  app.use("/api/v2", router);
}

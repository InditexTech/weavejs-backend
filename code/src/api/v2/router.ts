// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Express, Router } from "express";
import { getServiceConfig } from "../../config/config.js";
import { getCorsMiddleware } from "../../middlewares/cors.js";
import { postGenerateImageController } from "./controllers/postGenerateImage.js";
import { postEditImageController } from "./controllers/postEditImage.js";

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

  app.use("/api/v2", router);
}

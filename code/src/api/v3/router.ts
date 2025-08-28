// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Express, Router } from "express";
import { getServiceConfig } from "../../config/config.js";
import { getCorsMiddleware } from "../../middlewares/cors.js";
import { postGenerateImageControllerV2 } from "./controllers/postGenerateImage.js";
import { postEditImageControllerV2 } from "./controllers/postEditImage.js";

const router: Router = Router();

export function getApiV3Router() {
  return router;
}

export function setupApiV3Router(app: Express) {
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
    postGenerateImageControllerV2()
  );
  router.post(
    `/${hubName}/rooms/:roomId/images/edit`,
    cors,
    postEditImageControllerV2()
  );

  app.use("/api/v3", router);
}

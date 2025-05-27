// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Express, Router } from "express";
import multer from "multer";
import { getServiceConfig } from "../../config/config.js";
import { getHealthController } from "./controllers/getHealth.js";
import { getRoomConnectController } from "./controllers/getRoomConnect.js";
import { getImageController } from "./controllers/getImage.js";
import { postUploadImageController } from "./controllers/postUploadImage.js";
import { delImageController } from "./controllers/delImage.js";
import { getImagesController } from "./controllers/getImages.js";
import { postRemoveBackgroundController } from "./controllers/postRemoveBackground.js";
import { getAzureWebPubsubServer } from "../../store.js";
import { getAbuseProtection } from "./controllers/getAbuseProtection.js";

const router: Router = Router();

export function getApiV1Router() {
  return router;
}

export function setupApiV1Router(app: Express) {
  const config = getServiceConfig();

  const {
    pubsub: { hubName },
  } = config;

  const router: Router = Router();

  // Setup multer to upload files
  const upload = multer();

  // Setup router routes
  router.get(`/health`, getHealthController());
  router.options(`/abuse-protection`, getAbuseProtection());

  // Room handling API
  router.use(getAzureWebPubsubServer().getMiddleware());
  router.get(`/${hubName}/rooms/:roomId/connect`, getRoomConnectController());

  // Images handling API
  router.get(`/${hubName}/rooms/:roomId/images`, getImagesController());
  router.get(`/${hubName}/rooms/:roomId/images/:imageId`, getImageController());
  router.post(`/${hubName}/rooms/:roomId/images/:imageId/remove-background`, postRemoveBackgroundController());
  router.post(`/${hubName}/rooms/:roomId/images`, upload.single('file'), postUploadImageController());
  router.delete(`/${hubName}/rooms/:roomId/images/:imageId`, delImageController());

  app.use("/api/v1", router);
}

// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Express, Router } from "express";
import multer from "multer";
import { getServiceConfig } from "../../config/config.js";
import { getRoomConnectController } from "./controllers/getRoomConnect.js";
import { getImageController } from "./controllers/getImage.js";
import { postUploadImageController } from "./controllers/postUploadImage.js";
import { delImageController } from "./controllers/delImage.js";
import { getImagesController } from "./controllers/getImages.js";
import { postRemoveBackgroundController } from "./controllers/postRemoveBackground.js";
import { getAzureWebPubsubServer } from "../../store.js";
import { getCorsMiddleware } from "../../middlewares/cors.js";
import { postValidateAIPassword } from "./controllers/postValidateIAPassword.js";

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

  // Setup cors
  const cors = getCorsMiddleware();

  // Room handling API
  router.use(getAzureWebPubsubServer().getExpressJsMiddleware());
  router.get(
    `/${hubName}/rooms/:roomId/connect`,
    cors,
    getRoomConnectController()
  );

  // Images handling API
  router.get(`/${hubName}/rooms/:roomId/images`, cors, getImagesController());
  router.get(
    `/${hubName}/rooms/:roomId/images/:imageId`,
    cors,
    getImageController()
  );
  router.post(
    `/${hubName}/rooms/:roomId/images/:imageId/remove-background`,
    cors,
    postRemoveBackgroundController()
  );
  router.post(`/ai/password/validate`, cors, postValidateAIPassword());
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

  app.use("/api/v1", router);
}

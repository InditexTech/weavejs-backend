// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Express, Router, json } from "express";
import multer from "multer";
import { getServiceConfig } from "../../config/config.js";
import { getCorsMiddleware } from "../../middlewares/cors.js";
import { postGenerateImageController } from "./controllers/postGenerateImage.js";
import { postEditImageController } from "./controllers/postEditImage.js";
import { postRemoveBackgroundController } from "./controllers/postRemoveBackground.js";
import { getTasksController } from "./controllers/getTasks.js";
import { getTasksNotOpenedController } from "./controllers/getTasksNotOpened.js";
import { getTaskController } from "./controllers/getTask.js";
import { putTaskController } from "./controllers/putTask.js";
import { getImagesController } from "./controllers/getImages.js";
import { getImageController } from "./controllers/getImage.js";
import { postUploadImageController } from "./controllers/postUploadImage.js";
import { delImageController } from "./controllers/delImage.js";
import { setupBodyParserMiddleware } from "../../middlewares/body-parser.js";
import { session } from "../../middlewares/session.js";
import { auth } from "../../middlewares/auth.js";
import { roomMember } from "../../middlewares/room-member.js";

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
  const routerBasePath = "/api/v2";

  // Setup multer to upload files
  const upload = multer();

  // Setup cors
  const cors = getCorsMiddleware(routerBasePath);

  setupBodyParserMiddleware(router, routerBasePath);

  router.post(
    `/${hubName}/rooms/:roomId/images/generate`,
    cors,
    session,
    auth,
    roomMember,
    json({ limit: "5mb" }),
    postGenerateImageController()
  );
  router.post(
    `/${hubName}/rooms/:roomId/images/edit`,
    cors,
    session,
    auth,
    roomMember,
    json({ limit: "100mb" }),
    postEditImageController()
  );
  router.get(
    `/${hubName}/rooms/:roomId/images`,
    cors,
    session,
    auth,
    roomMember,
    getImagesController()
  );
  router.get(
    `/${hubName}/rooms/:roomId/images/:imageId`,
    cors,
    session,
    auth,
    roomMember,
    getImageController()
  );
  router.post(
    `/${hubName}/rooms/:roomId/images`,
    cors,
    session,
    auth,
    roomMember,
    upload.single("file"),
    postUploadImageController()
  );
  router.delete(
    `/${hubName}/rooms/:roomId/images/:imageId`,
    cors,
    session,
    auth,
    roomMember,
    delImageController()
  );
  router.post(
    `/${hubName}/rooms/:roomId/images/:imageId/remove-background`,
    cors,
    session,
    auth,
    roomMember,
    json({ limit: "15mb" }),
    postRemoveBackgroundController()
  );

  if (config.features.workloads) {
    // Tasks API
    router.get(
      `/${hubName}/rooms/:roomId/tasks`,
      cors,
      session,
      auth,
      roomMember,
      getTasksController()
    );
    router.get(
      `/${hubName}/rooms/:roomId/tasks/not-opened`,
      cors,
      session,
      auth,
      roomMember,
      getTasksNotOpenedController()
    );
    router.get(
      `/${hubName}/rooms/:roomId/tasks/:taskId`,
      cors,
      session,
      auth,
      roomMember,
      getTaskController()
    );
    router.put(
      `/${hubName}/rooms/:roomId/tasks/:taskId`,
      cors,
      session,
      auth,
      roomMember,
      json(),
      putTaskController()
    );
  }

  app.use(routerBasePath, router);
}

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
import { getThreadsController } from "./controllers/getThreads.js";
import { getThreadController } from "./controllers/getThread.js";
import { postThreadController } from "./controllers/postThread.js";
import { putThreadController } from "./controllers/putThread.js";
import { delThreadController } from "./controllers/delThread.js";
import { getThreadAnswersController } from "./controllers/getThreadAnswers.js";
import { getThreadAnswerController } from "./controllers/getThreadAnswer.js";
import { delThreadAnswerController } from "./controllers/delThreadAnswer.js";
import { postThreadAnswerController } from "./controllers/postThreadAnswer.js";
import { putThreadAnswerController } from "./controllers/putThreadAnswer.js";
import { getRoomBusNegotiateController } from "./controllers/getRoomBusNegotiate.js";
import { postRoomBusJoinController } from "./controllers/postRoomBusJoin.js";
import { postExportToImageController } from "./controllers/postExportToImage.js";
import { setupBodyParserMiddleware } from "../../middlewares/body-parser.js";
import { getSimulateStoreWsErrorController } from "./controllers/getSimulateStoreWsError.js";
import { getVideosController } from "./controllers/getVideos.js";
import { getVideoController } from "./controllers/getVideo.js";
import { postUploadVideoController } from "./controllers/postUploadVideo.js";
import { delVideoController } from "./controllers/delVideo.js";
import { getVideoPlaceholderController } from "./controllers/getVideoPlaceholder.js";
import { postNegateImageController } from "./controllers/postNegateImage.js";
import { postFlipImageController } from "./controllers/postFlipImage.js";
import { postGrayscaleImageController } from "./controllers/postGrayscaleImage.js";
import { postUploadRoomController } from "./controllers/postUploadRoom.js";
import { getRoomToJsonController } from "./controllers/getRoomToJson.js";
import { getRoomController } from "./controllers/getRoom.js";

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
  const routerBasePath = "/api/v1";

  // Setup multer to upload files
  const upload = multer();

  // Setup cors
  const cors = getCorsMiddleware(routerBasePath);

  // Room handling API
  router.use(getAzureWebPubsubServer().getExpressJsMiddleware());

  setupBodyParserMiddleware(router, routerBasePath);

  router.get(
    `/${hubName}/rooms/:roomId/connect`,
    cors,
    getRoomConnectController()
  );

  // Room tools
  router.get(`/${hubName}/rooms/:roomId`, cors, getRoomController());
  router.get(`/${hubName}/rooms/:roomId/json`, cors, getRoomToJsonController());
  router.post(
    `/${hubName}/rooms/:roomId/upload`,
    cors,
    upload.single("file"),
    postUploadRoomController()
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
  router.post(
    `/${hubName}/rooms/:roomId/images/:imageId/negate`,
    cors,
    postNegateImageController()
  );
  router.post(
    `/${hubName}/rooms/:roomId/images/:imageId/flip/:orientation`,
    cors,
    postFlipImageController()
  );
  router.post(
    `/${hubName}/rooms/:roomId/images/:imageId/grayscale`,
    cors,
    postGrayscaleImageController()
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

  // Video handling API
  router.get(`/${hubName}/rooms/:roomId/videos`, cors, getVideosController());
  router.get(
    `/${hubName}/rooms/:roomId/videos/:videoId`,
    cors,
    getVideoController()
  );
  router.get(
    `/${hubName}/rooms/:roomId/videos/:videoId/placeholder`,
    cors,
    getVideoPlaceholderController()
  );
  router.post(
    `/${hubName}/rooms/:roomId/videos`,
    cors,
    upload.single("file"),
    postUploadVideoController()
  );
  router.delete(
    `/${hubName}/rooms/:roomId/videos/:videoId`,
    cors,
    delVideoController()
  );

  if (config.features.threads) {
    // Threads API
    router.get(
      `/${hubName}/rooms/:roomId/threads`,
      cors,
      getThreadsController()
    );
    router.get(
      `/${hubName}/rooms/:roomId/threads/:threadId`,
      cors,
      getThreadController()
    );
    router.post(
      `/${hubName}/rooms/:roomId/threads`,
      cors,
      postThreadController()
    );
    router.put(
      `/${hubName}/rooms/:roomId/threads/:threadId`,
      cors,
      putThreadController()
    );
    router.delete(
      `/${hubName}/rooms/:roomId/threads/:threadId`,
      cors,
      delThreadController()
    );

    // Threads Answers API

    router.get(
      `/${hubName}/rooms/:roomId/threads/:threadId/answers`,
      cors,
      getThreadAnswersController()
    );
    router.get(
      `/${hubName}/rooms/:roomId/threads/:threadId/answers/:answerId`,
      cors,
      getThreadAnswerController()
    );
    router.post(
      `/${hubName}/rooms/:roomId/threads/:threadId/answers`,
      cors,
      postThreadAnswerController()
    );
    router.put(
      `/${hubName}/rooms/:roomId/threads/:threadId/answers/:answerId`,
      cors,
      putThreadAnswerController()
    );
    router.delete(
      `/${hubName}/rooms/:roomId/threads/:threadId/answers/:answerId`,
      cors,
      delThreadAnswerController()
    );

    // Bus API
    router.get(
      `/${hubName}/rooms/:roomId/bus/:userId`,
      cors,
      getRoomBusNegotiateController()
    );
    router.post(
      `/${hubName}/rooms/:roomId/bus/:userId`,
      cors,
      postRoomBusJoinController()
    );

    // Render Canvas API
    router.post(`/${hubName}/export`, cors, postExportToImageController());
  }

  // Store testing API (only in dev mode)
  router.get(
    `/${hubName}/rooms/:roomId/simulate-ws-error`,
    cors,
    getSimulateStoreWsErrorController()
  );

  app.use(routerBasePath, router);
}

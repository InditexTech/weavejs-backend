// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Application, Router } from "express";
import multer from "multer";
import { getServiceConfig } from "../../config/config.js";
import { getRoomConnectController } from "./controllers/getRoomConnect.js";
import { getImageController } from "./controllers/getImage.js";
import { getChatImageController } from "./controllers/getChatImage.js";
import { getChatsController } from "./controllers/getChats.js";
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
import { getStandaloneThreadsController } from "./controllers/standalone/getStandaloneThreads.js";
import { getStandaloneThreadController } from "./controllers/standalone/getStandaloneThread.js";
import { postStandaloneThreadController } from "./controllers/standalone/postStandaloneThread.js";
import { putStandaloneThreadController } from "./controllers/standalone/putStandaloneThread.js";
import { delStandaloneThreadController } from "./controllers/standalone/delStandaloneThread.js";
import { getStandaloneThreadAnswersController } from "./controllers/standalone/getStandaloneThreadAnswers.js";
import { getStandaloneThreadAnswerController } from "./controllers/standalone/getStandaloneThreadAnswer.js";
import { delStandaloneThreadAnswerController } from "./controllers/standalone/delStandaloneThreadAnswer.js";
import { postStandaloneThreadAnswerController } from "./controllers/standalone/postStandaloneThreadAnswer.js";
import { putStandaloneThreadAnswerController } from "./controllers/standalone/putStandaloneThreadAnswer.js";
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
import { postTemplateController } from "./controllers/postTemplate.js";
import { getTemplatesController } from "./controllers/getTemplates.js";
import { delTemplateController } from "./controllers/delTemplate.js";
import { getTemplateController } from "./controllers/getTemplate.js";
import { getFrameTemplatesController } from "./controllers/getFrameTemplates.js";
import { postChatController } from "./controllers/postChat.js";
import { delChatController } from "./controllers/delChat.js";
import { getChatController } from "./controllers/getChat.js";
import { postChatMessageController } from "./controllers/postChatMessage.js";
import { putChatController } from "./controllers/putChat.js";
import { getStandaloneImagesController } from "./controllers/standalone/getStandaloneImages.js";
import { postStandaloneUploadImageController } from "./controllers/standalone/postStandaloneUploadImage.js";
import { getStandaloneImageController } from "./controllers/standalone/getStandaloneImage.js";
import { putStandaloneSaveInstanceImageController } from "./controllers/standalone/putStandaloneSaveInstanceImage.js";
import { getStandaloneInstanceImageController } from "./controllers/standalone/getStandaloneInstanceImage.js";
import { postAiChatMessageController } from "./controllers/ai/postChatMessage.js";

const router: Router = Router();

export function getApiV1Router() {
  return router;
}

export function setupApiV1Router(app: Application) {
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

  // AI Chat API
  router.get(
    `/${hubName}/rooms/:roomId/chats/:chatId/images/:imageId`,
    cors,
    getChatImageController()
  );
  router.get(`/${hubName}/rooms/:roomId/chats`, cors, getChatsController());
  router.get(
    `/${hubName}/rooms/:roomId/chats/:chatId`,
    cors,
    getChatController()
  );
  router.put(
    `/${hubName}/rooms/:roomId/chats/:chatId`,
    cors,
    putChatController()
  );
  router.post(`/${hubName}/rooms/:roomId/chats`, cors, postChatController());
  router.post(
    `/${hubName}/rooms/:roomId/chats/:chatId/messages`,
    cors,
    postChatMessageController()
  );
  router.delete(
    `/${hubName}/rooms/:roomId/chats/:chatId`,
    cors,
    delChatController()
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

    // Threads Standalone API
    router.get(
      `/${hubName}/standalone/:instanceId/images/:imageId/threads`,
      cors,
      getStandaloneThreadsController()
    );
    router.get(
      `/${hubName}/standalone/:instanceId/images/:imageId/threads/:threadId`,
      cors,
      getStandaloneThreadController()
    );
    router.post(
      `/${hubName}/standalone/:instanceId/images/:imageId/threads`,
      cors,
      postStandaloneThreadController()
    );
    router.put(
      `/${hubName}/standalone/:instanceId/images/:imageId/threads/:threadId`,
      cors,
      putStandaloneThreadController()
    );
    router.delete(
      `/${hubName}/standalone/:instanceId/images/:imageId/threads/:threadId`,
      cors,
      delStandaloneThreadController()
    );

    // Threads Answers API

    router.get(
      `/${hubName}/standalone/:instanceId/images/:imageId/threads/:threadId/answers`,
      cors,
      getStandaloneThreadAnswersController()
    );
    router.get(
      `/${hubName}/standalone/:instanceId/images/:imageId/threads/:threadId/answers/:answerId`,
      cors,
      getStandaloneThreadAnswerController()
    );
    router.post(
      `/${hubName}/standalone/:instanceId/images/:imageId/threads/:threadId/answers`,
      cors,
      postStandaloneThreadAnswerController()
    );
    router.put(
      `/${hubName}/standalone/:instanceId/images/:imageId/threads/:threadId/answers/:answerId`,
      cors,
      putStandaloneThreadAnswerController()
    );
    router.delete(
      `/${hubName}/standalone/:instanceId/images/:imageId/threads/:threadId/answers/:answerId`,
      cors,
      delStandaloneThreadAnswerController()
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

  // Template handling API
  router.get(
    `/${hubName}/rooms/:roomId/templates`,
    cors,
    getTemplatesController()
  );
  router.get(
    `/${hubName}/rooms/:roomId/templates/frame`,
    cors,
    getFrameTemplatesController()
  );
  router.get(
    `/${hubName}/rooms/:roomId/templates/:templateId`,
    cors,
    getTemplateController()
  );
  router.post(
    `/${hubName}/rooms/:roomId/templates`,
    cors,
    postTemplateController()
  );
  router.delete(
    `/${hubName}/rooms/:roomId/templates/:templateId`,
    cors,
    delTemplateController()
  );

  // Standalone usage example
  router.get(
    `/${hubName}/standalone/:instanceId/images/:imageId`,
    cors,
    getStandaloneImageController()
  );
  router.put(
    `/${hubName}/standalone/:instanceId/images/:imageId/data`,
    cors,
    putStandaloneSaveInstanceImageController()
  );
  router.get(
    `/${hubName}/standalone/:instanceId/images/:imageId/data`,
    cors,
    getStandaloneInstanceImageController()
  );
  router.get(
    `/${hubName}/standalone/:instanceId/images`,
    cors,
    getStandaloneImagesController()
  );
  router.post(
    `/${hubName}/standalone/:instanceId/images`,
    cors,
    upload.single("file"),
    postStandaloneUploadImageController()
  );

  // AI chat
  router.post(
    `/${hubName}/rooms/:roomId/ai/chats/:chatId/message`,
    cors,
    postAiChatMessageController()
  );

  app.use(routerBasePath, router);
}

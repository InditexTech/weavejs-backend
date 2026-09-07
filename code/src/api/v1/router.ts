// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Application, Router, raw, json } from "express";
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
import { postExportPageToImageAsyncController } from "./controllers/postExportPageToImageAsync.js";
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
import { postTemplateController } from "./controllers/postTemplate.js";
import { getTemplatesController } from "./controllers/getTemplates.js";
import { delTemplateController } from "./controllers/delTemplate.js";
import { getTemplateController } from "./controllers/getTemplate.js";
import { getFrameTemplatesController } from "./controllers/getFrameTemplates.js";
import { postChatController } from "./controllers/postChat.js";
import { delChatController } from "./controllers/delChat.js";
import { getChatController } from "./controllers/getChat.js";
import { putChatController } from "./controllers/putChat.js";
import { getStandaloneImagesController } from "./controllers/standalone/getStandaloneImages.js";
import { postStandaloneUploadImageController } from "./controllers/standalone/postStandaloneUploadImage.js";
import { getStandaloneImageController } from "./controllers/standalone/getStandaloneImage.js";
import { putStandaloneSaveInstanceImageController } from "./controllers/standalone/putStandaloneSaveInstanceImage.js";
import { getStandaloneInstanceImageController } from "./controllers/standalone/getStandaloneInstanceImage.js";
import { postAiChatMessageController } from "./controllers/ai/postChatMessage.js";
import { getTemplatesImageController } from "./controllers/templates/getTemplatesImage.js";
import { getTemplatesImagesController } from "./controllers/templates/getTemplatesImages.js";
import { postTemplatesUploadImageController } from "./controllers/templates/postTemplatesUploadImage.js";
import { getRoomsStorageController } from "./controllers/getRoomsStorage.js";
import { postAddImageTemplateToRoomController } from "./controllers/postAddImageTemplateToRoom.js";
import { postAddTemplateToRoomController } from "./controllers/postAddTemplateToRoom.js";
import { delTemplatesImageController } from "./controllers/templates/delTemplatesImage.js";
import { getExportedImageController } from "./controllers/getExportedImage.js";
import { getExportedPdfController } from "./controllers/getExportedPdf.js";
import { delPageController } from "./controllers/pages/delPage.js";
import { getPagesController } from "./controllers/pages/getPages.js";
import { postPageController } from "./controllers/pages/postPage.js";
import { putPageController } from "./controllers/pages/putPage.js";
import { getPageController } from "./controllers/pages/getPage.js";
import { postDisconnectSyncHostController } from "./controllers/postDisconnectSyncHost.js";
import { postConnectTransportSyncHostController } from "./controllers/postConnectTransportSyncHost.js";
import { postDisconnectTransportSyncHostController } from "./controllers/postDisconnectTransportSyncHost.js";
import { getRoomsController } from "./controllers/rooms/getRooms.js";
import { postRoomController } from "./controllers/rooms/postRoom.js";
import { auth } from "@/middlewares/auth.js";
import { session } from "@/middlewares/session.js";
import { roomMember } from "@/middlewares/room-member.js";
import { pageMember } from "@/middlewares/page-member.js";
import { instanceMember } from "@/middlewares/instance-member.js";
import { internalToken } from "@/middlewares/internal-token.js";
import { getRoomController } from "./controllers/rooms/getRoom.js";
import { putRoomController } from "./controllers/rooms/putRoom.js";
import { delRoomController } from "./controllers/rooms/delRoom.js";
import { postRoomAccessController } from "./controllers/rooms/postRoomAccess.js";
import { putRoomAccessController } from "./controllers/rooms/putRoomAccess.js";
import { getRoomStorageController } from "./controllers/getRoomStorage.js";
import { getPageByIndexController } from "./controllers/pages/getPageByIndex.js";
import { putPageThumbnailController } from "./controllers/pages/putPageThumbnail.js";
import { getPageThumbnailController } from "./controllers/pages/getPageThumbnail.js";
import { getRoomThumbnailController } from "./controllers/rooms/getRoomThumbnail.js";
import { postExportFramesToPDFAsyncController } from "./controllers/postExportFramesToPDFAsync.js";
import { postExportRoomToPDFAsyncController } from "./controllers/postExportRoomToPDFAsync.js";
import { postGeneratePresentationModeImagesAsyncController } from "./controllers/postGeneratePresentationModeImagesAsync.js";
import { getPresentationImageController } from "./controllers/getPresentationImage.js";
import { getAllPagesController } from "./controllers/pages/getAllPages.js";
import { getRoomImageFallbackController } from "./controllers/getRoomImageFallback.js";
import { postUploadRoomImageFallbackController } from "./controllers/postUploadRoomImageFallback.js";
import { getLogger } from "@/logger/logger.js";
import {
  aiImageOperationRateLimit,
  aiPasswordRateLimit,
  roomImageUploadRateLimit,
  roomVideoUploadRateLimit,
} from "@/middlewares/api-rate-limit.js";

const router: Router = Router();

export function getApiV1Router() {
  return router;
}

export function setupApiV1Router(app: Application) {
  const config = getServiceConfig();

  const logger = getLogger().child({ module: "api-v1-router" });

  const {
    pubsub: { hubName },
  } = config;

  const router: Router = Router();
  const routerBasePath = "/api/v1";

  // Setup multer to upload files
  const upload = multer({ limits: { fileSize: 100 * 1024 * 1024 } });

  // Setup cors
  const cors = getCorsMiddleware(routerBasePath);

  // Room handling API
  router.use(getAzureWebPubsubServer().getExpressJsMiddleware());

  setupBodyParserMiddleware(router, routerBasePath);

  router.get(
    `/${hubName}/rooms/:roomId/connect`,
    cors,
    session,
    auth,
    pageMember,
    getRoomConnectController(),
  );

  // Room tools
  router.get(
    `/${hubName}/rooms`,
    cors,
    session,
    auth,
    getRoomsStorageController(),
  );
  router.get(
    `/${hubName}/rooms/:roomId`,
    cors,
    session,
    auth,
    pageMember,
    getRoomStorageController(),
  );
  router.get(
    `/${hubName}/rooms/:roomId/pages/:pageId/image-fallback`,
    cors,
    session,
    auth,
    getRoomImageFallbackController(),
  );
  router.post(
    `/${hubName}/rooms/:roomId/pages/:pageId/image-fallback`,
    cors,
    session,
    auth,
    raw({ type: "*/*", limit: "20mb" }),
    postUploadRoomImageFallbackController(),
  );
  router.get(
    `/${hubName}/rooms/:roomId/json`,
    cors,
    session,
    auth,
    getRoomToJsonController(),
  );
  router.post(
    `/${hubName}/rooms/:roomId/upload`,
    cors,
    session,
    auth,
    upload.single("file"),
    postUploadRoomController(),
  );

  // AI Chat API
  router.get(
    `/${hubName}/rooms/:roomId/chats/:chatId/images/:imageId`,
    cors,
    internalToken,
    session,
    auth,
    roomMember,
    getChatImageController(),
  );
  router.get(
    `/${hubName}/rooms/:roomId/chats`,
    cors,
    session,
    auth,
    getChatsController(),
  );
  router.get(
    `/${hubName}/rooms/:roomId/chats/:chatId`,
    cors,
    session,
    auth,
    getChatController(),
  );
  router.put(
    `/${hubName}/rooms/:roomId/chats/:chatId`,
    cors,
    session,
    auth,
    putChatController(),
  );
  router.post(
    `/${hubName}/rooms/:roomId/chats`,
    cors,
    session,
    auth,
    postChatController(),
  );
  router.delete(
    `/${hubName}/rooms/:roomId/chats/:chatId`,
    cors,
    session,
    auth,
    delChatController(),
  );

  // Images handling API
  router.get(
    `/${hubName}/rooms/:roomId/images`,
    cors,
    session,
    auth,
    roomMember,
    getImagesController(),
  );
  router.get(
    `/${hubName}/rooms/:roomId/images/:imageId`,
    cors,
    internalToken,
    session,
    auth,
    roomMember,
    getImageController(),
  );
  router.post(
    `/${hubName}/rooms/:roomId/images/:imageId/remove-background`,
    cors,
    session,
    auth,
    aiImageOperationRateLimit,
    roomMember,
    json({ limit: "15mb" }),
    postRemoveBackgroundController(),
  );
  router.post(
    `/${hubName}/rooms/:roomId/images/:imageId/negate`,
    cors,
    session,
    auth,
    roomMember,
    json({ limit: "15mb" }),
    postNegateImageController(),
  );
  router.post(
    `/${hubName}/rooms/:roomId/images/:imageId/flip/:orientation`,
    cors,
    session,
    auth,
    roomMember,
    json({ limit: "15mb" }),
    postFlipImageController(),
  );
  router.post(
    `/${hubName}/rooms/:roomId/images/:imageId/grayscale`,
    cors,
    session,
    auth,
    roomMember,
    json({ limit: "15mb" }),
    postGrayscaleImageController(),
  );
  router.post(
    `/ai/password/validate`,
    cors,
    session,
    auth,
    aiPasswordRateLimit,
    postValidateAIPassword(),
  );
  router.post(
    `/${hubName}/rooms/:roomId/images`,
    cors,
    session,
    auth,
    roomImageUploadRateLimit,
    roomMember,
    upload.single("file"),
    postUploadImageController(),
  );
  router.delete(
    `/${hubName}/rooms/:roomId/images/:imageId`,
    cors,
    session,
    auth,
    roomMember,
    delImageController(),
  );

  // Video handling API
  router.get(
    `/${hubName}/rooms/:roomId/videos`,
    cors,
    session,
    auth,
    getVideosController(),
  );
  router.get(
    `/${hubName}/rooms/:roomId/videos/:videoId`,
    cors,
    internalToken,
    session,
    auth,
    roomMember,
    getVideoController(),
  );
  router.get(
    `/${hubName}/rooms/:roomId/videos/:videoId/placeholder`,
    cors,
    internalToken,
    session,
    auth,
    roomMember,
    getVideoPlaceholderController(),
  );
  router.post(
    `/${hubName}/rooms/:roomId/videos`,
    cors,
    session,
    auth,
    roomVideoUploadRateLimit,
    roomMember,
    upload.single("file"),
    postUploadVideoController(),
  );
  router.delete(
    `/${hubName}/rooms/:roomId/videos/:videoId`,
    cors,
    session,
    auth,
    roomMember,
    delVideoController(),
  );

  if (config.features.threads) {
    // Threads API
    router.get(
      `/${hubName}/rooms/:roomId/threads`,
      cors,
      session,
      auth,
      pageMember,
      getThreadsController(),
    );
    router.get(
      `/${hubName}/rooms/:roomId/threads/:threadId`,
      cors,
      session,
      auth,
      pageMember,
      getThreadController(),
    );
    router.post(
      `/${hubName}/rooms/:roomId/threads`,
      cors,
      session,
      auth,
      pageMember,
      postThreadController(),
    );
    router.put(
      `/${hubName}/rooms/:roomId/threads/:threadId`,
      cors,
      session,
      auth,
      pageMember,
      putThreadController(),
    );
    router.delete(
      `/${hubName}/rooms/:roomId/threads/:threadId`,
      cors,
      session,
      auth,
      pageMember,
      delThreadController(),
    );

    // Threads Answers API

    router.get(
      `/${hubName}/rooms/:roomId/threads/:threadId/answers`,
      cors,
      session,
      auth,
      pageMember,
      getThreadAnswersController(),
    );
    router.get(
      `/${hubName}/rooms/:roomId/threads/:threadId/answers/:answerId`,
      cors,
      session,
      auth,
      pageMember,
      getThreadAnswerController(),
    );
    router.post(
      `/${hubName}/rooms/:roomId/threads/:threadId/answers`,
      cors,
      session,
      auth,
      pageMember,
      postThreadAnswerController(),
    );
    router.put(
      `/${hubName}/rooms/:roomId/threads/:threadId/answers/:answerId`,
      cors,
      session,
      auth,
      pageMember,
      putThreadAnswerController(),
    );
    router.delete(
      `/${hubName}/rooms/:roomId/threads/:threadId/answers/:answerId`,
      cors,
      session,
      auth,
      pageMember,
      delThreadAnswerController(),
    );

    // Threads Standalone API
    router.get(
      `/${hubName}/standalone/:instanceId/images/:imageId/threads`,
      cors,
      session,
      auth,
      getStandaloneThreadsController(),
    );
    router.get(
      `/${hubName}/standalone/:instanceId/images/:imageId/threads/:threadId`,
      cors,
      session,
      auth,
      getStandaloneThreadController(),
    );
    router.post(
      `/${hubName}/standalone/:instanceId/images/:imageId/threads`,
      cors,
      session,
      auth,
      postStandaloneThreadController(),
    );
    router.put(
      `/${hubName}/standalone/:instanceId/images/:imageId/threads/:threadId`,
      cors,
      session,
      auth,
      putStandaloneThreadController(),
    );
    router.delete(
      `/${hubName}/standalone/:instanceId/images/:imageId/threads/:threadId`,
      cors,
      session,
      auth,
      delStandaloneThreadController(),
    );

    // Threads Answers API

    router.get(
      `/${hubName}/standalone/:instanceId/images/:imageId/threads/:threadId/answers`,
      cors,
      session,
      auth,
      getStandaloneThreadAnswersController(),
    );
    router.get(
      `/${hubName}/standalone/:instanceId/images/:imageId/threads/:threadId/answers/:answerId`,
      cors,
      session,
      auth,
      getStandaloneThreadAnswerController(),
    );
    router.post(
      `/${hubName}/standalone/:instanceId/images/:imageId/threads/:threadId/answers`,
      cors,
      session,
      auth,
      postStandaloneThreadAnswerController(),
    );
    router.put(
      `/${hubName}/standalone/:instanceId/images/:imageId/threads/:threadId/answers/:answerId`,
      cors,
      session,
      auth,
      putStandaloneThreadAnswerController(),
    );
    router.delete(
      `/${hubName}/standalone/:instanceId/images/:imageId/threads/:threadId/answers/:answerId`,
      cors,
      session,
      auth,
      delStandaloneThreadAnswerController(),
    );

    // Bus API
    router.get(
      `/${hubName}/rooms/:roomId/bus/:userId`,
      cors,
      session,
      auth,
      getRoomBusNegotiateController(),
    );
    router.post(
      `/${hubName}/rooms/:roomId/bus/:userId`,
      cors,
      session,
      auth,
      postRoomBusJoinController(),
    );

    // Render Canvas API
    router.get(
      `/${hubName}/rooms/:roomId/export/:imageId`,
      cors,
      session,
      auth,
      roomMember,
      getExportedImageController(),
    );
    router.post(
      `/${hubName}/rooms/:roomId/export`,
      cors,
      session,
      auth,
      json({ limit: "50mb" }),
      postExportPageToImageAsyncController(),
    );
    router.get(
      `/${hubName}/rooms/:roomId/export/pdf/:pdfId`,
      cors,
      session,
      auth,
      roomMember,
      getExportedPdfController(),
    );
    router.post(
      `/${hubName}/rooms/:roomId/export/pdf`,
      cors,
      session,
      auth,
      postExportRoomToPDFAsyncController(),
    );
    router.post(
      `/${hubName}/rooms/:roomId/frames/export/pdf`,
      cors,
      session,
      auth,
      json({ limit: "50mb" }),
      postExportFramesToPDFAsyncController(),
    );
  }

  // Store testing API (only in dev mode)
  router.get(
    `/${hubName}/rooms/:roomId/simulate-ws-error`,
    cors,
    session,
    auth,
    getSimulateStoreWsErrorController(),
  );

  // Template handling API
  router.get(
    `/${hubName}/rooms/:roomId/templates`,
    cors,
    session,
    auth,
    roomMember,
    getTemplatesController(),
  );
  router.get(
    `/${hubName}/rooms/:roomId/templates/frame`,
    cors,
    session,
    auth,
    roomMember,
    getFrameTemplatesController(),
  );
  router.get(
    `/${hubName}/rooms/:roomId/templates/:templateId`,
    cors,
    session,
    auth,
    roomMember,
    getTemplateController(),
  );
  router.post(
    `/${hubName}/rooms/:roomId/templates`,
    cors,
    session,
    auth,
    roomMember,
    postTemplateController(),
  );
  router.delete(
    `/${hubName}/rooms/:roomId/templates/:templateId`,
    cors,
    session,
    auth,
    roomMember,
    delTemplateController(),
  );

  // Standalone usage example
  router.get(
    `/${hubName}/standalone/:instanceId/images/:imageId`,
    cors,
    session,
    auth,
    getStandaloneImageController(),
  );
  router.put(
    `/${hubName}/standalone/:instanceId/images/:imageId/data`,
    cors,
    session,
    auth,
    putStandaloneSaveInstanceImageController(),
  );
  router.get(
    `/${hubName}/standalone/:instanceId/images/:imageId/data`,
    cors,
    session,
    auth,
    getStandaloneInstanceImageController(),
  );
  router.get(
    `/${hubName}/standalone/:instanceId/images`,
    cors,
    session,
    auth,
    getStandaloneImagesController(),
  );
  router.post(
    `/${hubName}/standalone/:instanceId/images`,
    cors,
    session,
    auth,
    upload.single("file"),
    postStandaloneUploadImageController(),
  );

  // Standalone usage example
  router.get(
    `/${hubName}/templates/:instanceId/images/:imageId`,
    cors,
    session,
    auth,
    instanceMember,
    getTemplatesImageController(),
  );
  router.get(
    `/${hubName}/templates/:instanceId/images`,
    cors,
    session,
    auth,
    instanceMember,
    getTemplatesImagesController(),
  );
  router.delete(
    `/${hubName}/templates/:instanceId/images/:imageId`,
    cors,
    session,
    auth,
    instanceMember,
    delTemplatesImageController(),
  );
  router.post(
    `/${hubName}/templates/:instanceId/images`,
    cors,
    session,
    auth,
    instanceMember,
    upload.single("file"),
    postTemplatesUploadImageController(),
  );

  // AI chat
  router.get(
    `/${hubName}/rooms/:roomId/ai/chats/:chatId/stream`,
    cors,
    session,
    auth,
    getChatController(),
  );
  if (process.env.AI_SERVICES === "true") {
    logger.info("AI services enabled: registering AI chat message endpoint");
    router.post(
      `/${hubName}/rooms/:roomId/ai/chats/:chatId/message`,
      cors,
      session,
      auth,
      postAiChatMessageController(),
    );
  } else {
    logger.warn(
      "AI services are disabled: AI chat message endpoint will not be registered",
    );
  }

  // Templates API

  router.post(
    `/${hubName}/templates/add-image-template-to-room`,
    cors,
    session,
    auth,
    postAddImageTemplateToRoomController(),
  );

  router.post(
    `/${hubName}/templates/add-template-to-room`,
    cors,
    session,
    auth,
    postAddTemplateToRoomController(),
  );

  // Rooms API

  router.get(`/rooms`, cors, session, auth, getRoomsController());
  router.get(`/rooms/:roomId`, cors, session, auth, getRoomController());
  router.post(`/rooms`, cors, session, auth, postRoomController());
  router.put(`/rooms/:roomId`, cors, session, auth, putRoomController());
  router.delete(`/rooms/:roomId`, cors, session, auth, delRoomController());

  // Rooms Access API

  router.post(
    `/rooms/access-link`,
    cors,
    session,
    auth,
    postRoomAccessController(),
  );
  router.put(
    `/rooms/access-link/:accessId`,
    cors,
    session,
    auth,
    putRoomAccessController(),
  );

  // Pages API

  router.get(
    `/${hubName}/rooms/:roomId/pages/all`,
    cors,
    session,
    auth,
    roomMember,
    getAllPagesController(),
  );

  router.get(
    `/${hubName}/rooms/:roomId/pages`,
    cors,
    session,
    auth,
    roomMember,
    getPagesController(),
  );

  router.get(
    `/${hubName}/rooms/:roomId/pages/:pageIndex/index`,
    cors,
    session,
    auth,
    roomMember,
    getPageByIndexController(),
  );

  router.get(
    `/${hubName}/rooms/:roomId/pages/:pageId`,
    cors,
    session,
    auth,
    roomMember,
    getPageController(),
  );

  router.post(
    `/${hubName}/rooms/:roomId/pages`,
    cors,
    session,
    auth,
    roomMember,
    postPageController(),
  );

  router.put(
    `/${hubName}/rooms/:roomId/pages/:pageId`,
    cors,
    session,
    auth,
    roomMember,
    putPageController(),
  );

  router.get(
    `/${hubName}/rooms/:roomId/thumbnail`,
    cors,
    session,
    auth,
    roomMember,
    getRoomThumbnailController(),
  );

  router.get(
    `/${hubName}/rooms/:roomId/pages/:pageId/thumbnail`,
    cors,
    session,
    auth,
    roomMember,
    getPageThumbnailController(),
  );

  router.put(
    `/${hubName}/rooms/:roomId/pages/:pageId/thumbnail`,
    cors,
    session,
    auth,
    roomMember,
    raw({ type: "*/*", limit: "2mb" }),
    putPageThumbnailController(),
  );

  router.delete(
    `/${hubName}/rooms/:roomId/pages/:pageId`,
    cors,
    session,
    auth,
    roomMember,
    delPageController(),
  );

  // SYNC HOST DISCONNECT API
  router.post(
    `/${hubName}/sync-host/disconnect`,
    cors,
    session,
    auth,
    postDisconnectSyncHostController(),
  );

  router.post(
    `/${hubName}/sync-host/transport/connect`,
    cors,
    session,
    auth,
    postConnectTransportSyncHostController(),
  );

  router.post(
    `/${hubName}/sync-host/transport/disconnect`,
    cors,
    session,
    auth,
    postDisconnectTransportSyncHostController(),
  );

  // PRESENTATION MODE IMAGES API
  router.get(
    `/${hubName}/rooms/:roomId/presentation-mode/:presentationId/pages/:pageId/image`,
    cors,
    session,
    auth,
    roomMember,
    getPresentationImageController(),
  );

  router.post(
    `/${hubName}/rooms/:roomId/presentation-mode`,
    cors,
    session,
    auth,
    roomMember,
    json({ limit: "1mb" }),
    postGeneratePresentationModeImagesAsyncController(),
  );

  app.use(routerBasePath, router);
}

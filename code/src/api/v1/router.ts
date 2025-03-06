import { Express, Router } from "express";
import multer from "multer";
import { setupRoomsMiddleware } from "../../middlewares/rooms.js";
import { getServiceConfig } from "../../config/config.js";
import { getHealthController } from "./controllers/getHealth.js";
import { getRoomConnectController } from "./controllers/getRoomConnect.js";
import { getImageController } from "./controllers/getImage.js";
import { postUploadImageController } from "./controllers/postUploadImage.js";
import { delImageController } from "./controllers/delImage.js";

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

  // Setup router middlewares
  setupRoomsMiddleware(router);

  // Setup multer to upload files
  const upload = multer();

  // Setup router routes
  router.get(`/health`, getHealthController());
  router.get(`/${hubName}/rooms/:roomId/connect`, getRoomConnectController());
  router.get(`/images/:imageId`, getImageController());
  router.post(`/images`, upload.single('file'), postUploadImageController());
  router.delete(`/images/:imageId`, delImageController());

  app.use("/api/v1", router);
}

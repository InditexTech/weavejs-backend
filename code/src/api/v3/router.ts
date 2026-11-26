// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Express, Router, json } from "express";
import { getServiceConfig } from "../../config/config.js";
import { getCorsMiddleware } from "../../middlewares/cors.js";
import { postGenerateImageControllerV2 } from "./controllers/postGenerateImage.js";
import { postEditImageControllerV2 } from "./controllers/postEditImage.js";
import { setupBodyParserMiddleware } from "../../middlewares/body-parser.js";
import { session } from "@/middlewares/session.js";
import { auth } from "@/middlewares/auth.js";
import {
  aiImageOperationRateLimit,
  retentionRateLimit,
} from "@/middlewares/api-rate-limit.js";
import { retentionToken } from "@/middlewares/retention-token.js";
import { postRetentionRunController } from "./controllers/postRetentionRun.js";
import { getRetentionRunController } from "./controllers/getRetentionRun.js";

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
  const routerBasePath = "/api/v3";

  // Setup cors
  const cors = getCorsMiddleware(routerBasePath);

  setupBodyParserMiddleware(router, routerBasePath);

  router.post(
    `/${hubName}/rooms/:roomId/images/generate`,
    cors,
    session,
    auth,
    aiImageOperationRateLimit,
    json({ limit: "5mb" }),
    postGenerateImageControllerV2(),
  );
  router.post(
    `/${hubName}/rooms/:roomId/images/edit`,
    cors,
    session,
    auth,
    aiImageOperationRateLimit,
    json({ limit: "100mb" }),
    postEditImageControllerV2(),
  );

  // Room retention. Started and read by the scheduling workflow with a
  // dedicated token, so there is no session and no CORS.
  router.post(
    `/${hubName}/retention/runs`,
    retentionRateLimit,
    retentionToken(),
    json({ limit: "64kb" }),
    postRetentionRunController(),
  );
  router.get(
    `/${hubName}/retention/runs/:runId`,
    retentionRateLimit,
    retentionToken(),
    getRetentionRunController(),
  );

  app.use(routerBasePath, router);
}

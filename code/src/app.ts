// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";
import express, { type Express } from "express";
import { setupHttpLoggerMiddleware } from "./middlewares/http-logger.js";
// import { setupHttpResponseHeadersMiddleware } from "./middlewares/http-response-headers.js";
import { setupApiV1Router } from "./api/v1/router.js";
import { setupApiV2Router } from "./api/v2/router.js";
import { setupHealthChecksRouter } from "./api/health-checks/router.js";
import { setLogLevel } from "@azure/logger";
import { getLogger } from "./logger/logger.js";
import { setupApiV3Router } from "./api/v3/router.js";
import { getServiceConfig } from "./config/config.js";

setLogLevel("verbose");

let app: Express | null = null;

export function getApp() {
  if (!app) {
    throw new Error("App not initialized");
  }

  return app;
}

export function setupApp() {
  // Setup the service
  app = express();

  const config = getServiceConfig();

  // // Setup Middlewares
  setupHttpLoggerMiddleware(app);
  // setupHttpResponseHeadersMiddleware(app);

  // // Setup Health Checks Router
  setupHealthChecksRouter(app);

  // // Setup Routers
  setupApiV1Router(app);
  setupApiV2Router(app);
  if (config.features.workloads) {
    setupApiV3Router(app);
  }

  // Serve static files
  const staticFilesPath = path.join(process.cwd(), "assets");
  const logger = getLogger().child({ module: "app" });
  logger.info(`Static files served from: ${staticFilesPath}`);
  app.use(
    "/assets",
    express.static(staticFilesPath, {
      setHeaders(res) {
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
      },
    })
  );

  return app;
}

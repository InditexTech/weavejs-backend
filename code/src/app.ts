// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Express } from "express";
import { setupHttpLoggerMiddleware } from "./middlewares/http-logger.js";
import { setupHttpResponseHeadersMiddleware } from "./middlewares/http-response-headers.js";
import { setupBodyParserMiddleware } from "./middlewares/body-parser.js";
import { setupApiV1Router } from "./api/v1/router.js";
import { setupApiV2Router } from "./api/v2/router.js";
import { setupHealthChecksRouter } from "./api/health-checks/router.js";
import { setLogLevel } from "@azure/logger";
import { getLogger } from "./logger/logger.js";

setLogLevel("verbose");

let app: Express | null = null;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getApp() {
  if (!app) {
    throw new Error("App not initialized");
  }

  return app;
}

export function setupApp() {
  // Setup the service
  app = express();

  // Setup Middlewares
  setupHttpLoggerMiddleware(app);
  setupHttpResponseHeadersMiddleware(app);
  setupBodyParserMiddleware(app);

  // Setup Health Checks Router
  setupHealthChecksRouter(app);

  // Setup Routers
  setupApiV1Router(app);
  setupApiV2Router(app);

  // Serve static files
  const staticFilesPath = path.join(__dirname, "..", "assets");
  const logger = getLogger().child({ module: "app" });
  logger.info(`Setting up static files support from ${staticFilesPath}`);
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

// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import express, { type Express } from "express";
import { setupHttpLoggerMiddleware } from "./middlewares/http-logger.js";
import { setupHttpResponseHeadersMiddleware } from "./middlewares/http-response-headers.js";
import { setupBodyParserMiddleware } from "./middlewares/body-parser.js";
import { setupApiV1Router } from "./api/v1/router.js";
import { setupApiV2Router } from "./api/v2/router.js";
import { setLogLevel } from "@azure/logger";

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

  // Setup Middlewares
  setupHttpLoggerMiddleware(app);
  setupHttpResponseHeadersMiddleware(app);
  setupBodyParserMiddleware(app);

  // Setup Routers
  setupApiV1Router(app);
  setupApiV2Router(app);

  return app;
}

// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Express } from "express";
import { pinoHttp } from "pino-http";
import { getLogger } from "../logger/logger.js";

export function setupHttpLoggerMiddleware(app: Express) {
  const logger = getLogger().child({ module: "middlewares.http-logger" });

  logger.info("HTTP logger configured");

  // Setup http logger
  const httpLogger = pinoHttp({ logger: getLogger(), useLevel: "info" });
  app.use(httpLogger);
}

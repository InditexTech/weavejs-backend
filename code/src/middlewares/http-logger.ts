// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Express } from "express";
import { pinoHttp } from "pino-http";
import { getLogger } from "../logger/logger.js";
import { LevelWithSilent } from "pino";

export function setupHttpLoggerMiddleware(app: Express) {
  const logger = getLogger().child({
    module: "middlewares.http-logger",
  });

  logger.info("HTTP logger configured");

  const httpLogLevel: LevelWithSilent = process.env.HTTP_LOG_LEVEL
    ? (process.env.HTTP_LOG_LEVEL as LevelWithSilent)
    : "debug";

  // Setup http logger
  const httpLogger = pinoHttp({
    logger: getLogger(),
    useLevel: httpLogLevel,
  });
  app.use(httpLogger);
}

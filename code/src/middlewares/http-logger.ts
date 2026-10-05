// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Express } from "express";
import { pinoHttp } from "pino-http";
import { getLogger } from "../logger/logger.js";
import { LevelWithSilent, stdSerializers } from "pino";

const isTokenParam = (param: string) => {
  const name = param.split("=")[0].replace(/\+/g, " ");
  try {
    return decodeURIComponent(name) === "_token";
  } catch {
    return false;
  }
};

const stripInternalToken = (url: string) => {
  const queryStart = url.indexOf("?");
  if (queryStart === -1) {
    return url;
  }
  const params = url
    .slice(queryStart + 1)
    .split("&")
    .filter((param) => !isTokenParam(param));
  return params.length
    ? `${url.slice(0, queryStart)}?${params.join("&")}`
    : url.slice(0, queryStart);
};

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
    redact: ['req.headers["x-internal-token"]'],
    serializers: {
      req: (req) => {
        const serialized = stdSerializers.req(req);
        return { ...serialized, url: stripInternalToken(serialized.url) };
      },
    },
  });
  app.use(httpLogger);
}

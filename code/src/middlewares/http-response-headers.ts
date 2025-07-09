// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Express } from "express";
import helmet from "helmet";
import { getLogger } from "../logger/logger.js";

export function setupHttpResponseHeadersMiddleware(app: Express) {
  const logger = getLogger().child({
    module: "middlewares.http-response-headers",
  });

  logger.info("Setting up HTTP response headers middleware");

  // Use Helmet for setting security-related HTTP headers
  app.use(
    helmet({
      crossOriginResourcePolicy: false,
    })
  );
}

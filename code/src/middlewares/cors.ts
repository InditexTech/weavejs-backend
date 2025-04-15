// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Express } from "express";
import cors from "cors";
import { getLogger } from "../logger/logger.js";

export function setupCorsMiddleware(app: Express) {
  const logger = getLogger().child({ module: "middlewares.cors" });

  // Setup CORS configuration
  const corsOptions = {
    origin: true,
  };

  logger.info({ corsOptions }, "Setting up CORS middleware");

  app.use(cors(corsOptions));
}

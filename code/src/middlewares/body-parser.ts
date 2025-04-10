// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import express, { Express } from "express";
import { getLogger } from "../logger/logger.js";

export function setupBodyParserMiddleware(app: Express) {
  const logger = getLogger().child({ module: "middlewares.body-parser" });

  logger.info("Setting up HTTP request body parser middleware");

  // Setup HTTP body parser to JSON
  app.use(express.json());
}

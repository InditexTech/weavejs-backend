// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import express, { Router } from "express";
import { getLogger } from "../logger/logger.js";

export function setupBodyParserMiddleware(router: Router, path: string) {
  const logger = getLogger().child({ module: "middlewares.body-parser" });

  // Setup HTTP body parser to JSON with a conservative default limit.
  // Routes that accept large payloads (images, room data) must apply a
  // route-level express.json({ limit: "..." }) middleware before their handler.
  router.use(express.json({ limit: "1mb" }));

  logger.info(`Body parser configured on path: ${path}`);
}

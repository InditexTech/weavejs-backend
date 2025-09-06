// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import cors from "cors";
import { getLogger } from "../logger/logger.js";

export function getCorsMiddleware(path: string) {
  const logger = getLogger().child({ module: "middlewares.cors" });

  // Setup CORS configuration
  const corsOptions = {
    origin: true,
  };

  logger.info({ corsOptions }, `CORS configured on path: ${path}`);

  return cors(corsOptions);
}

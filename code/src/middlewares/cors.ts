// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import cors from "cors";
import { getServiceConfig } from "../config/config.js";
import { getLogger } from "../logger/logger.js";

export function getCorsMiddleware(path: string) {
  const logger = getLogger().child({ module: "middlewares.cors" });

  const { allowedOrigins } = getServiceConfig().cors;

  // Setup CORS configuration with an explicit origin allowlist.
  // Reflecting arbitrary origins (origin: true) with credentials: true would
  // let any site make authenticated cross-origin requests (CWE-942 / CWE-352).
  const corsOptions = {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      // Non-browser / same-origin requests have no Origin header — allow them.
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Unknown origin: omit CORS headers so the browser blocks the response.
      callback(null, false);
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: [
      "Content-Type",
      "X-AI-Password",
      "x-weave-user-id",
      "x-weave-client-id",
    ],
    credentials: true,
  };

  logger.info({ allowedOrigins }, `CORS configured on path: ${path}`);

  return cors(corsOptions);
}

// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { ZodError } from "zod";
import { getServiceConfig } from "./config/config.js";
import { ServiceConfig } from "./types.js";
import { getLogger } from "./logger/logger.js";

export function validateServiceConfig() {
  let config: ServiceConfig | null = null;
  const logger = getLogger().child({ module: "validate" });

  try {
    config = getServiceConfig();
  } catch (ex) {
    if (ex instanceof ZodError) {
      for (const issue of ex.issues) {
        logger.error(issue.message);
      }
    }
  }

  return config;
}

// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { pino, Logger } from "pino";
import { AzureLogger, AzureLogLevel, setLogLevel } from "@azure/logger";

let logger: Logger | null = null;

export function getLogger() {
  if (!logger) {
    throw new Error("Logger not initialized");
  }

  return logger;
}

export function setupLogger() {
  setLogLevel((process.env.AZURE_LOG_LEVEL ?? "error") as AzureLogLevel);

  logger = pino({
    level: process.env.LOG_LEVEL ?? "error",
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        singleLine: true,
      },
    },
  });

  AzureLogger.log = (...args) => {
    const azureLogger = getLogger().child({ module: "azure" });
    azureLogger.info(null, ...args);
  };
}

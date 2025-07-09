// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getLogger, setupLogger } from "./logger/logger.js";
import { setupApp } from "./app.js";
import { setupStorage, setupStore } from "./store.js";
import { validateServiceConfig } from "./validate.js";

// __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Setup service logger
setupLogger();
const logger = getLogger().child({ module: "server" });

// Validate service config
const config = validateServiceConfig();

if (!config) {
  process.exit(1);
}

// Setup the Azure Web Pubsub store
await setupStorage();
// Setup the Azure Web Pubsub store
setupStore();

// Init application
const app = setupApp();

// Start server
if (process.env.HTTPS_ENABLED === "true") {
  const options = {
    key: fs.readFileSync(path.join(__dirname, "../server.key")),
    cert: fs.readFileSync(path.join(__dirname, "../server.crt")),
  };

  https
    .createServer(options, app)
    .listen(config.service.port, config.service.hostname, () => {
      logger.info(
        `Server started: https://${config.service.hostname}:${config.service.port}`
      );
    });
} else {
  http
    .createServer(app)
    .listen(config.service.port, config.service.hostname, () => {
      logger.info(
        `Server started: http://${config.service.hostname}:${config.service.port}`
      );
    });
}

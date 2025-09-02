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
import { setupStore } from "./store.js";
import { setupWorkloads } from "./workloads/workloads.js";
import { setupEvents } from "./events/events.js";
import { setupDatabase } from "./database/database.js";
import { setupStorage } from "./storage/storage.js";
import { getServiceConfig } from "./config/config.js";
import { setupCommBus } from "./comm-bus/comm-bus.js";

const start = async () => {
  try {
    // __dirname equivalent in ESM
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    // Setup service logger
    setupLogger();
    const logger = getLogger().child({ module: "server" });

    const config = getServiceConfig();

    if (config.features.threads) {
      // Setup database
      await setupDatabase();
    }

    if (config.features.workloads) {
      // Setup events
      await setupEvents();
      // Setup the workloads
      await setupWorkloads();
    }

    await setupCommBus();

    // Setup the Azure Storage
    await setupStorage();

    // Setup the Azure Web Pubsub store
    await setupStore();

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
  } catch (ex) {
    console.error("Fatal error during service initialization");
    console.error(ex);

    process.exit(1);
  }
};

(async () => {
  await start();
})();

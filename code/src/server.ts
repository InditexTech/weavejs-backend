// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";
import { getLogger, setupLogger } from "./logger/logger.js";
import { setupApp } from "./app.js";
import { setupStore, setupStoreRoomsCleanup } from "./store.js";
import { setupWorkloads } from "./workloads/workloads.js";
import { setupDatabase } from "./database/database.js";
import { setupStorage } from "./storage/storage.js";
import { getServiceConfig } from "./config/config.js";
import { setupCommBus } from "./comm-bus/comm-bus.js";
import { setupWorkers } from "./workers/workers.js";
import { setupAuth } from "@/lib/auth.js";
import { setupMcpServer } from "./mcp/index.js";
import {
  addNodeState,
  createNodeTypeDefaultState,
  getAvailableNodes,
  updateNodeState,
} from "./weave-mcp.setup.js";

const start = async () => {
  try {
    // Setup service logger
    setupLogger();
    const logger = getLogger().child({ module: "server" });

    logger.info("Starting service...");
    logger.info(`Log level set to: ${process.env.LOG_LEVEL ?? "error"}`);

    const config = getServiceConfig();

    await setupAuth();

    // Setup node.js workers
    await setupWorkers();

    if (config.features.threads) {
      // Setup database
      await setupDatabase();
    }

    if (config.features.workloads) {
      // Setup the workloads
      await setupWorkloads();
    }

    await setupCommBus();

    // Setup the Azure Storage
    await setupStorage();

    // Setup the Azure Web Pubsub store
    await setupStore();
    setupStoreRoomsCleanup();

    // Init application
    const app = setupApp();

    await setupMcpServer(app, {
      getAvailableNodes,
      createNodeTypeDefaultState,
      addNodeState,
      updateNodeState,
    });

    if (process.env.PRINT_MEMORY_USAGE === "true") {
      const printInterval = parseInt(
        process.env.PRINT_MEMORY_USAGE_INTERVAL ?? "500",
        10,
      );
      logger.info(`Memory usage enabled, printed every ${printInterval} ms`);
      setInterval(() => {
        console.log(
          "HEAP ",
          (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + " MB",
          " | EXTE ",
          (process.memoryUsage().external / 1024 / 1024).toFixed(2) + " MB",
          " | RSS1 ",
          (process.memoryUsage().rss / 1024 / 1024).toFixed(2) + " MB",
        );
      }, printInterval);
    }

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
            `Server started: https://${config.service.hostname}:${config.service.port}`,
          );
        });
    } else {
      http
        .createServer(app)
        .listen(config.service.port, config.service.hostname, () => {
          logger.info(
            `Server started: http://${config.service.hostname}:${config.service.port}`,
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

// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { getLogger, setupLogger } from "./logger/logger.js";
import { setupApp } from "./app.js";
import { setupStore } from "./store.js";
import { validateServiceConfig } from "./validate.js";

// Setup service logger
setupLogger();
const logger = getLogger().child({ module: "server" });

// Validate service config
const config = validateServiceConfig();

if (!config) {
  process.exit(1);
}

// Setup the Azure Web Pubsub store
setupStore();

// Init application
const app = setupApp();

// Start server
app.listen(config.service.port, config.service.hostname, () => {
  logger.info(
    `Server started: http://${config.service.hostname}:${config.service.port}`,
  );
});

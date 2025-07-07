// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Express, Router } from "express";
import { getLivenessHealthCheckController } from "./controllers/getLivenessHealthCheck.js";
import { getReadinessHealthCheckController } from "./controllers/getReadinessHealthCheck.js";
import { getStartUpHealthCheckController } from "./controllers/getStartUpHealthCheck.js";

const router: Router = Router();

export function getHealthChecksRouter() {
  return router;
}

export function setupHealthChecksRouter(app: Express) {
  const router: Router = Router();

  // Setup router routes
  router.get(`/liveness`, getLivenessHealthCheckController());
  router.get(`/readiness`, getReadinessHealthCheckController());
  router.get(`/startup`, getStartUpHealthCheckController());

  app.use("/v1", router);
}

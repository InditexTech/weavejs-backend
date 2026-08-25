// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getAzureWebPubsubServer } from "../../../store.js";
import { isStorageInitialized } from "../../../storage/storage.js";

// Readiness means "setup has completed", not "third-party is currently
// reachable" — deliberately does not perform any live network call against
// Azure Web PubSub (see getLivenessHealthCheck.ts for why). getAzureWebPubsubServer()
// throws if the store hasn't been constructed yet, which is what we want to detect.
export const getReadinessHealthCheckController =
  () =>
  (req: Request, res: Response): void => {
    try {
      getAzureWebPubsubServer();
    } catch {
      res.status(500).json({ status: "Not initialized" });
      return;
    }

    if (!isStorageInitialized()) {
      res.status(500).json({ status: "Not initialized" });
      return;
    }

    res.status(200).json({ status: "OK" });
  };

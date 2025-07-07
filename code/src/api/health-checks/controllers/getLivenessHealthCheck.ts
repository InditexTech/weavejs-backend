// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getAzureWebPubsubServer, isStorageConnected } from "../../../store.js";

export const getLivenessHealthCheckController =
  () =>
  async (req: Request, res: Response): Promise<void> => {
    const testRoomId = "test-readiness-room";

    if (!getAzureWebPubsubServer) {
      res
        .status(500)
        .json({ error: "Azure Web PubSub store instance not found" });
      return;
    }

    const url = await getAzureWebPubsubServer().clientConnect(testRoomId);

    if (!url) {
      res
        .status(500)
        .json({ status: "Azure Web Pubsub store failed to connect." });
      return;
    }

    if (!(await isStorageConnected())) {
      res.status(500).json({ status: "Azure Blob Storage failed to connect." });
      return;
    }

    res.status(200).json({ status: "OK" });
  };

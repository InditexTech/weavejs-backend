// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import {
  getAzureWebPubsubServer,
  isStorageInitialized,
} from "../../../store.js";

export const getStartUpHealthCheckController =
  () =>
  (req: Request, res: Response): void => {
    if (!getAzureWebPubsubServer || !isStorageInitialized()) {
      res.status(500).json({ status: "Not initialized" });
      return;
    }

    res.status(200).json({ status: "OK" });
  };

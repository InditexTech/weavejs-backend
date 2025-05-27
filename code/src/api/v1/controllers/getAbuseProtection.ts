// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getServiceConfig } from "../../../config/config.js";

export const getAbuseProtection = () => (req: Request, res: Response): void => {
  const requestOrigin = req.get('WebHook-Request-Origin');
  const config = getServiceConfig();

  if (!requestOrigin) {
    res.status(400).json({ status: "BAD_REQUEST" });
    return;
  }

  if (requestOrigin && config.pubsub.validOrigin !== requestOrigin) {
    res.status(500).send("KO");
    return;
  }

  res.set('WebHook-Allowed-Origin', config.pubsub.validOrigin);
  res.status(200).send("OK");
};

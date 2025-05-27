// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";

const VALID_ORIGINS = [
  "pubsub-weavejs-development.webpubsub.azure.com",
  "pubsub-weavejs-production.webpubsub.azure.com"
]

export const getAbuseProtection = () => (req: Request, res: Response): void => {
  const requestOrigin = req.get('WebHook-Request-Origin');

  if (typeof requestOrigin !== "undefined") {
    res.status(400).json({ status: "BAD_REQUEST" });
  }

  if (!VALID_ORIGINS.includes(requestOrigin as string)) {
    res.status(500).send("KO");
  }

  res.set('WebHook-Allowed-Origin', requestOrigin);
  res.status(200).send("OK");
};

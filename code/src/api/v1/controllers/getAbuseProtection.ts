// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";

const VALID_ORIGINS = [
  "https://weavejs.cloud.inditex.com",
  "https://weavejs-dev.cloud.inditex.com",
  "https://weavejs-frontend.politemoss-e17eae3c.westeurope.azurecontainerapps.io"
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

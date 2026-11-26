// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { createHash, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { getServiceConfig } from "@/config/config.js";

const digest = (value: string) => createHash("sha256").update(value).digest();

const matches = (header: unknown, token: string) =>
  typeof header === "string" &&
  header.length > 0 &&
  timingSafeEqual(digest(header), digest(token));

// Guards the room retention endpoints with the dedicated trigger token. When no
// token is configured the endpoints do not exist, so the feature stays off
// until it is deliberately enabled.
export const retentionToken =
  (getToken: () => string = () => getServiceConfig().retentionTriggerToken) =>
  (req: Request, res: Response, next: NextFunction) => {
    const token = getToken();

    if (token === "") {
      res.status(404).json({ status: "KO", message: "Not found" });
      return;
    }

    if (!matches(req.headers["x-retention-token"], token)) {
      res.status(401).json({ status: "KO", message: "Unauthorized" });
      return;
    }

    next();
  };

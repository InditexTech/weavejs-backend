// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { createHash, timingSafeEqual } from "node:crypto";
import { Request, Response, NextFunction } from "express";
import { getServiceConfig } from "@/config/config.js";
import { verifyMediaToken } from "@/utils/media-token.js";

const digest = (value: string) => createHash("sha256").update(value).digest();

const matchesMasterToken = (header: unknown, token: string) =>
  typeof header === "string" &&
  token.length > 0 &&
  timingSafeEqual(digest(header), digest(token));

export function internalToken(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { internalToken: token } = getServiceConfig();

  if (matchesMasterToken(req.headers["x-internal-token"], token)) {
    req.isInternalRequest = true;
  } else if (
    (req.method === "GET" || req.method === "HEAD") &&
    verifyMediaToken(token, req.query._t, `${req.baseUrl}${req.path}`)
  ) {
    req.isInternalRequest = true;
  }
  next();
}

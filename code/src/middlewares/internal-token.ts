// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response, NextFunction } from "express";
import { getServiceConfig } from "@/config/config.js";

export function internalToken(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  const { internalToken: token } = getServiceConfig();
  if (req.query._token === token) {
    req.isInternalRequest = true;
  }
  next();
}

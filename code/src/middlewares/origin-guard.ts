// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response, NextFunction } from "express";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function getRequestOrigin(req: Request): string | undefined {
  const origin = req.headers.origin;
  if (typeof origin === "string" && origin !== "") {
    return origin;
  }

  const referer = req.headers.referer;
  if (typeof referer === "string" && referer !== "") {
    try {
      return new URL(referer).origin;
    } catch {
      return undefined;
    }
  }

  return undefined;
}

// Requests without Origin/Referer (non-browser clients) are allowed through.
export function getOriginGuardMiddleware(allowedOrigins: string[]) {
  const allowed = new Set(allowedOrigins);

  return (req: Request, res: Response, next: NextFunction) => {
    if (!MUTATING_METHODS.has(req.method)) {
      next();
      return;
    }

    const origin = getRequestOrigin(req);
    if (origin === undefined || allowed.has(origin)) {
      next();
      return;
    }

    res.status(403).json({ status: "KO", message: "Origin not allowed" });
  };
}

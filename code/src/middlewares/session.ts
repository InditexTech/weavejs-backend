// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { getAuth } from "@/lib/auth.js";

export async function session(req: Request, res: Response, next: NextFunction) {
  try {
    req.session = await getAuth().api.getSession({
      headers: fromNodeHeaders(req.headers),
    });
  } catch {
    req.session = null;
  }
  next();
}

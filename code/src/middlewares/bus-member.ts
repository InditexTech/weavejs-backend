// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response, NextFunction } from "express";
import { GLOBAL_BUS_ID } from "@/comm-bus/constants.js";
import { roomMember } from "@/middlewares/room-member.js";

export async function busMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (req.params.roomId === GLOBAL_BUS_ID) {
    return next();
  }

  return roomMember(req, res, next);
}

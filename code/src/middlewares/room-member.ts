// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response, NextFunction } from "express";
import { getRoomUser } from "@/database/controllers/room-user.js";

export async function roomMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const roomId = req.params.roomId as string;
  const userId = req.session!.user.id;

  const member = await getRoomUser({ roomId, userId });

  if (!member) {
    res.status(403).json({
      status: "KO",
      message: "You don't have access to this room",
    });
    return;
  }

  next();
}

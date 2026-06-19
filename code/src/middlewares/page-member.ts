// SPDX-FileCopyrightText: 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response, NextFunction } from "express";
import { getPageByPageId } from "@/database/controllers/page.js";
import { getRoomUser } from "@/database/controllers/room-user.js";

export async function pageMember(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const pageId = req.params.roomId as string;
  const userId = req.session!.user.id;

  const page = await getPageByPageId({ pageId });

  if (!page) {
    res.status(403).json({
      status: "KO",
      message: "You don't have access to this page",
    });
    return;
  }

  const member = await getRoomUser({ roomId: page.roomId, userId });

  if (!member) {
    res.status(403).json({
      status: "KO",
      message: "You don't have access to this room",
    });
    return;
  }

  next();
}

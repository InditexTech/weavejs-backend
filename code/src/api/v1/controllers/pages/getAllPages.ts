// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getRoomAllPages } from "@/database/controllers/page.js";

export const getAllPagesController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    let status: string | undefined = undefined;
    if (req.query.status) {
      status = req.query.status as string;
    }

    const roomPages = await getRoomAllPages({
      roomId,
      status,
    });

    res.status(200).json({ items: roomPages, total: roomPages.length });
  };
};

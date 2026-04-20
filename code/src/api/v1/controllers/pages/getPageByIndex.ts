// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getPageByIndex } from "@/database/controllers/page.js";

export const getPageByIndexController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const pageIndex = req.params.pageIndex as string;

    const pageObj = await getPageByIndex({
      roomId,
      index: parseInt(pageIndex, 10),
    });

    if (!pageObj) {
      res.status(404).json({
        status: "KO",
        message: "Page not found",
      });
      return;
    }

    res.status(200).json({ ...pageObj.dataValues, index: pageIndex });
  };
};

// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getPage, getPageIndex } from "@/database/controllers/page.js";

export const getPageController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const pageId = req.params.pageId as string;

    const pageObj = await getPage({
      roomId,
      pageId,
    });

    if (!pageObj) {
      res.status(404).json({
        status: "KO",
        message: "Page not found",
      });
      return;
    }

    const pageIndex = await getPageIndex({
      roomId,
      pageId,
    });

    res.status(200).json({ ...pageObj.dataValues, index: pageIndex });
  };
};

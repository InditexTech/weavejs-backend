// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { broadcastToGlobal, broadcastToRoom } from "@/comm-bus/comm-bus.js";
import {
  getPage,
  getPageByIndex,
  getPageIndex,
  updatePage,
} from "@/database/controllers/page.js";
import { Request, Response } from "express";

export const delPageController = () => {
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

    const archived = await updatePage(
      {
        roomId,
        pageId,
      },
      {
        status: "archived",
      },
    );

    if (archived === 1) {
      const previousPage = await getPageByIndex({
        roomId,
        index: pageIndex - 1,
      });

      broadcastToGlobal({
        type: "pageDeleted",
        payload: {
          pageId,
          goToPage: { ...previousPage?.dataValues, index: pageIndex - 1 },
        },
      });

      broadcastToRoom(roomId, {
        roomId,
        type: "pageDeleted",
        payload: {
          pageId,
          goToPage: { ...previousPage?.dataValues, index: pageIndex - 1 },
        },
      });

      res.status(200).json({
        status: "Page archived OK",
      });
    } else {
      res.status(500).json({
        status: "KO",
        message: "Error archiving page",
      });
    }
  };
};

// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { broadcastToRoom } from "@/comm-bus/comm-bus.js";
import {
  getPage,
  getPageIndex,
  updatePage,
} from "@/database/controllers/page.js";
import { Request, Response } from "express";

export const putPageController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const pageId = req.params.pageId as string;

    const { name, position } = req.body;

    let pageObj = await getPage({
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

    let page = undefined;
    try {
      page = await updatePage(
        { roomId, pageId },
        {
          name,
          position,
        },
      );
    } catch (error) {
      console.error("Error updating page:", error);
      page = await getPage({
        roomId,
        pageId,
      });
    }

    if (!page) {
      res.status(500).json({ status: "KO", message: "Error updating page" });
      return;
    }

    const pageIndex = await getPageIndex({
      roomId,
      pageId,
    });

    pageObj = await getPage({
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

    broadcastToRoom(roomId, {
      roomId,
      type: "pageUpdated",
      payload: {
        roomId,
        pageId,
      },
    });

    res.status(200).json({ ...pageObj.dataValues, index: pageIndex });
  };
};

// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { broadcastToGlobal, broadcastToRoom } from "@/comm-bus/comm-bus.js";
import {
  createPage,
  getLastPageRoom,
  getPage,
  getPageIndex,
} from "@/database/controllers/page.js";
import { Request, Response } from "express";

export const postPageController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;

    const { pageId, name } = req.body;

    const pageObj = await getPage({
      roomId,
      pageId,
    });

    if (pageObj) {
      res.status(409).json({ status: "KO", message: "Page already exists" });
      return;
    }

    const lastPageRoom = await getLastPageRoom({
      roomId,
    });

    let position = 1;
    if (lastPageRoom) {
      const lastPageIndex = await getPageIndex({
        roomId,
        pageId: lastPageRoom.pageId,
      });
      position = lastPageIndex + 1;
    }

    let page = undefined;
    try {
      page = await createPage({
        roomId,
        pageId,
        name,
        position,
        status: "active",
      });
    } catch (error) {
      console.error("Error creating page:", error);
      page = await getPage({
        roomId,
        pageId,
      });
    }

    if (!page) {
      res.status(500).json({ status: "KO", message: "Error creating page" });
      return;
    }

    const pageIndex = await getPageIndex({
      roomId,
      pageId,
    });

    broadcastToGlobal({
      type: "pageCreated",
      payload: {
        roomId,
        pageId,
      },
    });

    broadcastToRoom(roomId, {
      roomId,
      type: "pageCreated",
      payload: {
        roomId,
        pageId,
      },
    });

    res.status(201).json({ ...page.dataValues, index: pageIndex });
  };
};

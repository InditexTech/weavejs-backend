// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { broadcastToGlobal, broadcastToRoom } from "@/comm-bus/comm-bus.js";
import { getServiceConfig } from "@/config/config.js";
import { getPage, getPageIndex } from "@/database/controllers/page.js";
import { ImagesPersistenceHandler } from "@/images/persistence.js";
import { Request, Response } from "express";

export const putPageThumbnailController = () => {
  const config = getServiceConfig();
  const persistenceHandlerRoom = new ImagesPersistenceHandler(
    config,
    "rooms-thumbnails",
  );
  const persistenceHandler = new ImagesPersistenceHandler(
    config,
    "pages-thumbnails",
  );

  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const pageId = req.params.pageId as string;

    const thumbnail = req.body;

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

    await persistenceHandler.persist(
      `${roomId}/${pageId}`,
      { size: thumbnail.size, mimeType: "image/png" },
      thumbnail,
    );

    const pageIndex = await getPageIndex({
      roomId,
      pageId,
    });

    if (pageIndex === 1) {
      await persistenceHandlerRoom.persist(
        `${roomId}`,
        { size: thumbnail.size, mimeType: "image/png" },
        thumbnail,
      );

      broadcastToGlobal({
        type: "roomThumbnailUpdated",
        payload: {
          roomId,
        },
      });
    }

    broadcastToRoom(roomId, {
      roomId,
      type: "pageThumbnailUpdated",
      payload: {
        roomId,
        pageId,
      },
    });

    res.status(200).json({ saved: true });
  };
};

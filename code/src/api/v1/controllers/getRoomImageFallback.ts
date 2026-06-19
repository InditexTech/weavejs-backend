// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import {
  getBlobServiceClient,
  getContainerClient,
} from "../../../storage/storage.js";
import { getRoom } from "@/database/controllers/room.js";
import { getRoomUser } from "@/database/controllers/room-user.js";
import { getPage } from "@/database/controllers/page.js";

export const getRoomImageFallbackController =
  () =>
  async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;
    const pageId = req.params.pageId as string;

    const roomObj = await getRoom({
      roomId,
    });

    if (!roomObj) {
      res.status(404).json({
        status: "KO",
        message: "Room not found",
      });
      return;
    }

    const roomUserObj = await getRoomUser({
      roomId,
      userId: req.session.user.id,
    });

    if (!roomUserObj) {
      res.status(403).json({
        status: "KO",
        message: "You don't have access to this room",
      });
      return;
    }

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

    const docName = `${roomId}-image-fallback`;

    try {
      const containerClient = getContainerClient();
      const blobServiceClient = getBlobServiceClient();

      if (!containerClient || !blobServiceClient) {
        res
          .status(500)
          .json({ status: "KO", message: "Error accessing the storage" });
        return;
      }

      const blockBlobClient = containerClient.getBlockBlobClient(docName);
      if (!(await blockBlobClient.exists())) {
        res.status(404).json({ status: "KO", message: "Room doesn't exists" });
        return;
      }

      const MAX_FALLBACK_SIZE = 50 * 1024 * 1024; // 50 MB
      const properties = await blockBlobClient.getProperties();
      if ((properties.contentLength ?? 0) > MAX_FALLBACK_SIZE) {
        res.status(413).json({
          status: "KO",
          message: "Room image fallback too large",
        });
        return;
      }

      try {
        const buffer = await blockBlobClient.downloadToBuffer();
        res.json(JSON.parse(buffer.toString("utf8")));
      } catch (ex) {
        console.log(ex);
        res.status(500).json({
          status: "KO",
          message: "Error fetching the room image fallbacks",
        });
      }
    } catch (ex) {
      console.log(ex);
      res
        .status(500)
        .json({ status: "KO", message: "Error fetching the room" });
    }
  };

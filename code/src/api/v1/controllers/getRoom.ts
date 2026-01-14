// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import {
  getBlobServiceClient,
  getContainerClient,
} from "../../../storage/storage.js";

export const getRoomController =
  () =>
  async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId as string;

    const docName = `${roomId}`;

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

      const downloadResponse = await blockBlobClient.download();
      const readableStream = downloadResponse.readableStreamBody;
      const contentType =
        downloadResponse.contentType || "application/octet-stream";
      if (!downloadResponse.readableStreamBody) {
        res
          .status(500)
          .json({ status: "KO", message: "Error downloading room" });
        return;
      }

      if (!readableStream) {
        res
          .status(500)
          .json({ status: "KO", message: "Error downloading room" });
        return;
      }

      // Set HTTP headers
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${docName}"`);

      // Pipe the blob stream directly to the response (no buffering in memory)
      readableStream.pipe(res);
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ status: "KO", message: "Error fetching the room" });
    }
  };

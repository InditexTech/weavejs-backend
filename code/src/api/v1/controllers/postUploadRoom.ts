// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import {
  getBlobServiceClient,
  getContainerClient,
} from "../../../storage/storage.js";

export const postUploadRoomController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const file = req.file;

    const roomId = req.params.roomId;
    const data = file?.buffer ?? new Uint8Array();

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

      const hexString = data.toString();
      const cleanHex = hexString.startsWith("0x")
        ? hexString.slice(2)
        : hexString;
      const buffer = Buffer.from(cleanHex, "hex");
      const documentData = Uint8Array.from(buffer);

      const blockBlobClient = containerClient.getBlockBlobClient(docName);
      await blockBlobClient.upload(documentData, documentData.length);

      res.status(201).json({ status: "Room created OK", docName });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: "KO", message: "Error creating room" });
    }
  };
};

// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import {
  getBlobServiceClient,
  getContainerClient,
} from "../../../storage/storage.js";
import { getStateAsJson, streamToBuffer } from "../../../utils.js";

export const getRoomToJsonController = () => {
  return async (req: Request, res: Response): Promise<void> => {
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
      if (!downloadResponse.readableStreamBody) {
        res
          .status(500)
          .json({ status: "KO", message: "Error downloading room" });
        return;
      }

      const bufferData = await streamToBuffer(
        downloadResponse.readableStreamBody
      );
      const hexString = bufferData.toString();
      const cleanHex = hexString.startsWith("0x")
        ? hexString.slice(2)
        : hexString;
      const buffer = Buffer.from(cleanHex, "hex");
      const data = Uint8Array.from(buffer);

      const actualStateJson = getStateAsJson(data);

      res.status(200).json({ status: "OK", roomId, state: actualStateJson });
    } catch (error) {
      console.log(error);
      res
        .status(500)
        .json({ status: "KO", message: "Error fetching the room" });
    }
  };
};

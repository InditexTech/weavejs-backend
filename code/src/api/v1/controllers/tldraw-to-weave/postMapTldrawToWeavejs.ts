// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { WeaveState } from "@inditextech/weave-types";
import { weavejsToYjsBinary } from "@inditextech/weave-sdk";
import {
  getBlobServiceClient,
  getContainerClient,
  isStorageInitialized,
  setupStorage,
} from "@/storage/storage.js";
import { mappingTLDrawToWeaveJS } from "./utils/tldraw-to-weave.js";

export const postMapTlDrawToWeavejsController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const roomId = req.params.roomId;

    const payload = req.body;

    const mappedInfo = await mappingTLDrawToWeaveJS(payload);
    const actualState = weavejsToYjsBinary(mappedInfo.store as WeaveState);

    if (!isStorageInitialized()) {
      await setupStorage();
    }

    const containerClient = getContainerClient();
    const blobServiceClient = getBlobServiceClient();

    if (!containerClient || !blobServiceClient) {
      res.status(500).json({
        status: "KO",
        message: "Storage not initialized",
      });
      return;
    }

    const blockBlobClient = containerClient.getBlockBlobClient(roomId);
    await blockBlobClient.upload(actualState, actualState.length);

    res.status(200).json({
      result: {
        status: "completed",
        errors: [],
      },
      roomId,
      state: mappedInfo,
    });
  };
};

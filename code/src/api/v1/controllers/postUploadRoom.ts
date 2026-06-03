// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import { Request, Response } from "express";
import {
  getBlobServiceClient,
  getContainerClient,
} from "../../../storage/storage.js";
import { createRoom } from "@/database/controllers/room.js";
import { createRoomUser } from "@/database/controllers/room-user.js";
import { createPage } from "@/database/controllers/page.js";
import { getStateAsJson } from "@/utils.js";

export const postUploadRoomController = () => {
  return async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    const name = req.params.roomId;
    const type = req.body.type;
    const userId = req.body.userId;

    if (!type || !["base64", "hex"].includes(type) || !file) {
      res.status(400).json({ status: "KO", message: "Missing parameters" });
      return;
    }

    const data = file?.buffer ?? new Uint8Array();

    const roomId = uuidv4();
    const room = await createRoom({
      roomId,
      status: "active",
      name: `${name}`,
      kind: "showcase",
    });

    const roomUser = await createRoomUser({
      roomId,
      userId,
      role: "owner",
    });

    const pageId = uuidv4();
    const page = await createPage({
      roomId,
      pageId,
      name: "New Page",
      position: 1,
      status: "active",
    });

    const docName = `${pageId}`;

    try {
      const containerClient = getContainerClient();
      const blobServiceClient = getBlobServiceClient();

      if (!containerClient || !blobServiceClient) {
        res
          .status(500)
          .json({ status: "KO", message: "Error accessing the storage" });
        return;
      }

      let documentData: Uint8Array = new Uint8Array();

      if (type === "base64") {
        const dataBase64 = data.toString();
        const buffer = Buffer.from(dataBase64, "base64");
        documentData = Uint8Array.from(buffer);
      }
      if (type === "hex") {
        const hexString = data.toString();
        const cleanHex = hexString.startsWith("0x")
          ? hexString.slice(2)
          : hexString;
        const buffer = Buffer.from(cleanHex, "hex");
        documentData = Uint8Array.from(buffer);
      }

      const { document } = getStateAsJson(documentData);

      const { imageFallback, document: documentUpdated } =
        removeImageFallbacksAndEncode(document);

      const blockBlobClientFallbacks = containerClient.getBlockBlobClient(
        `${docName}-image-fallback`,
      );
      await blockBlobClientFallbacks.upload(
        JSON.stringify(imageFallback),
        Buffer.byteLength(JSON.stringify(imageFallback)),
      );

      const blockBlobClient = containerClient.getBlockBlobClient(docName);
      await blockBlobClient.upload(documentUpdated, documentUpdated.length);

      res
        .status(201)
        .json({ status: "Room created OK", room, roomUser, page, docName });
    } catch (error) {
      console.error(error);
      res.status(500).json({ status: "KO", message: "Error creating room" });
    }
  };
};

import * as Y from "yjs";

function clearImageFallback(
  node: Y.Map<unknown>,
  fallbacksExtracted: Record<string, string> = {},
) {
  const props = node.get("props");

  if (props instanceof Y.Map) {
    const resourceId = props.get("resourceId") as string | undefined;
    const imageFallback = props.get("imageFallback") as string | undefined;

    if (resourceId && imageFallback) {
      fallbacksExtracted[resourceId as string] = imageFallback as string;
    }

    props.set("imageFallback", undefined);

    const children = props.get("children");

    if (children instanceof Y.Array) {
      children.forEach((child) => {
        if (child instanceof Y.Map) {
          clearImageFallback(child, fallbacksExtracted);
        }
      });
    }
  }
}

export function removeImageFallbacksAndEncode(doc: Y.Doc): {
  document: Uint8Array;
  imageFallback: Record<string, string>;
} {
  const fallbacksExtracted = {};
  const weave = doc.getMap("weave");
  clearImageFallback(weave, fallbacksExtracted);
  console.log(fallbacksExtracted);
  return {
    imageFallback: fallbacksExtracted,
    document: Y.encodeStateAsUpdate(doc),
  };
}

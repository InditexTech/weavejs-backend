// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import * as Y from "yjs";
import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { getStore } from "@/store.js";
import { authorizeRoomPage, roomAccessErrorResult } from "../authorize.js";
import { WeaveStateManipulation } from "@inditextech/weave-sdk/server";
import { persistRoomDocument } from "@/templates/utils.js";

export const registerTool = (server: McpServer) => {
  server.registerTool(
    "delete-node",
    {
      title: "Deletes a node instance",
      description:
        "Deletes a node instance in a room by its id and returns the deleted node id.",
      inputSchema: z.object({
        roomId: z
          .string()
          .describe("The id of the room where the node will be deleted"),
        pageId: z
          .string()
          .describe(
            "The id of the page of the room that contains the node (document to operate on).",
          ),
        nodeId: z.string().describe("The id of the node to delete"),
      }),
      outputSchema: z.object({ nodeId: z.string() }),
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
        destructiveHint: true,
        openWorldHint: true,
      },
    },
    async ({ roomId, pageId, nodeId }, ctx) => {
      let roomDocument: Y.Doc | undefined = undefined;

      const authorized = await authorizeRoomPage(ctx, roomId, pageId);

      if (!authorized) {
        return roomAccessErrorResult();
      }

      roomDocument = await getStore().getRoomDocument(authorized.docId);

      const containerId = "mainLayer";
      const container = WeaveStateManipulation.getYjsElement(
        roomDocument,
        "mainLayer",
      );

      if (!container) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Container ${containerId} not found in room ${roomId}.`,
            },
          ],
          structuredContent: {
            error: `Container ${containerId} not found in room ${roomId}.`,
          },
        };
      }

      const node = WeaveStateManipulation.getYjsElement(roomDocument, nodeId);

      if (!node) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Node ${nodeId} not found in room ${roomId}.`,
            },
          ],
          structuredContent: {
            error: `Node ${nodeId} not found in room ${roomId}.`,
          },
        };
      }

      WeaveStateManipulation.deleteElements(container, [nodeId]);

      await persistRoomDocument(authorized.docId, roomDocument);

      const NODE_DELETED = {
        nodeId,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(NODE_DELETED),
          },
        ],
        structuredContent: NODE_DELETED,
      };
    },
  );
};

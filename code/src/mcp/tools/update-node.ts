// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import * as Y from "yjs";
import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { getStore } from "@/store.js";
import { authorizeRoomPage, roomAccessErrorResult } from "../authorize.js";
import { toolErrorResult } from "../tool-result.js";
import { WeaveStateManipulation } from "@inditextech/weave-sdk/server";
import {
  WeaveElementAttributes,
  WeaveStateElement,
} from "@inditextech/weave-types";
import { persistRoomDocument } from "@/templates/utils.js";
import { NodeTypeInformation } from "../types.js";

const inputBaseSchema = (nodeTypes: string[]) =>
  z.object({
    roomId: z
      .string()
      .describe("The id of the room where the node will be updated"),
    pageId: z
      .string()
      .describe(
        "The id of the page of the room that contains the node (document to operate on).",
      ),
    nodeId: z.string().describe("The id of the node that will be updated"),
    type: z.enum(nodeTypes).describe("The type of the node to add."),
    props: z
      .any()
      .describe(
        "The fulfilled schema of the node to update, make sure to use a valid node schema and only use the props property. No need to pass id or nodeType.",
      ),
  });

export const registerTool = (
  server: McpServer,
  getAvailableNodes: () => NodeTypeInformation[],
  updateNodeState: (
    prevNodeState: WeaveStateElement,
    nextProps: WeaveElementAttributes,
  ) => WeaveStateElement | undefined,
) => {
  const nodeTypes = getAvailableNodes().map((node) => node.type);

  server.registerTool(
    "update-node",
    {
      title: "Update a node instance properties",
      description:
        "Updates a node instance in a room by its id with the specified properties and returns the updated node id.",
      inputSchema: inputBaseSchema(nodeTypes),
      outputSchema: z.object({ nodeId: z.string() }),
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async ({ roomId, pageId, nodeId, type, props }, ctx) => {
      let roomDocument: Y.Doc | undefined = undefined;

      const authorized = await authorizeRoomPage(ctx, roomId, pageId);

      if (!authorized) {
        return roomAccessErrorResult();
      }

      roomDocument = await getStore().getRoomDocument(authorized.docId);

      if (!roomDocument) {
        return roomAccessErrorResult();
      }

      const containerId = "mainLayer";
      const container = WeaveStateManipulation.getYjsElement(
        roomDocument,
        "mainLayer",
      );

      if (!container) {
        return toolErrorResult(
          `Container ${containerId} not found in room ${roomId}.`,
        );
      }

      const nodeInstance = WeaveStateManipulation.getYjsElement(
        roomDocument,
        nodeId,
      );

      if (!nodeInstance) {
        return toolErrorResult(`Node ${nodeId} not found in room ${roomId}.`);
      }

      const originalNodeState = JSON.parse(JSON.stringify(nodeInstance));
      const nodeState: WeaveStateElement | undefined = updateNodeState(
        originalNodeState,
        props,
      );

      if (!nodeState) {
        return toolErrorResult(`Unsupported node type ${type}.`);
      }

      const { element } = WeaveStateManipulation.mapNodeToYjs(nodeState);
      WeaveStateManipulation.updateElements(container, [
        {
          nodeId,
          element,
        },
      ]);

      await persistRoomDocument(authorized.docId, roomDocument);

      const NODE_UPDATED = {
        nodeId,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(NODE_UPDATED),
          },
        ],
        structuredContent: NODE_UPDATED,
      };
    },
  );
};

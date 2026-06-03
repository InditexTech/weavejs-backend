// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import * as Y from "yjs";
import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { getStore } from "@/store.js";
import { WeaveStateManipulation } from "@inditextech/weave-sdk/server";
import { WeaveStateElement } from "@inditextech/weave-types";

export const registerTool = (server: McpServer) => {
  server.registerTool(
    "get-node",
    {
      title: "Get node instance from a room",
      description:
        "Finds a node instance in a room by its id and returns its information",
      inputSchema: z.object({
        roomId: z.string(),
        nodeId: z.string(),
      }),
      outputSchema: z.union([
        z.object({
          roomId: z.string(),
          containerId: z.string().nullable(),
          nodeId: z.string(),
          type: z.string(),
          properties: z.record(z.string(), z.unknown()),
        }),
        z.object({
          error: z.string(),
        }),
      ]),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async ({ roomId, nodeId }) => {
      let roomDocument: Y.Doc | undefined = undefined;

      roomDocument = await getStore().getRoomDocument(roomId);

      if (!roomDocument) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Error: Room ${roomId} not found.",
            },
          ],
          structuredContent: {
            error: `Room ${roomId} not found.`,
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

      const nodeJSON: WeaveStateElement = JSON.parse(JSON.stringify(node));

      const NODE = {
        roomId,
        containerId: "mainLayer",
        nodeId,
        type: nodeJSON.type,
        properties: {
          x: nodeJSON.props.x,
          y: nodeJSON.props.y,
          width: nodeJSON.props.width,
          height: nodeJSON.props.height,
          fill: nodeJSON.props.fill,
          stroke: nodeJSON.props.stroke,
          strokeWidth: nodeJSON.props.strokeWidth,
        },
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(NODE),
          },
        ],
        structuredContent: NODE,
      };
    },
  );
};

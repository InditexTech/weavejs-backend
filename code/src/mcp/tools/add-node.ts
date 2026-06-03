// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import * as Y from "yjs";
import { v4 as uuidv4 } from "uuid";
import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { getStore } from "@/store.js";
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
      .describe("The id of the room where the node will be added"),
    containerId: z
      .string()
      .optional()
      .describe("The id of the node that will act as container.")
      .default("mainLayer"),
    type: z.enum(nodeTypes).describe("The type of the node to add."),
    node: z
      .any()
      .describe(
        "The fulfilled schema of the node to add, make sure to use a valid node schema.",
      ),
  });
export const registerTool = (
  server: McpServer,
  getAvailableNodes: () => NodeTypeInformation[],
  createNodeTypeDefaultState: (
    nodeId: string,
    nodeType: string,
  ) => WeaveStateElement | undefined,
  addNodeState: (
    defaultNodeState: WeaveStateElement,
    props: WeaveElementAttributes,
  ) => WeaveStateElement | undefined,
) => {
  const nodeTypes = getAvailableNodes().map((node) => node.type);

  server.registerTool(
    "add-node",
    {
      title: "Add a new node instance",
      description: `Creates a new node instance in a room by providing the specified schema, returns the created node id.
        If no containerId is provided, the node will be added to the main layer of the room using 'mainLayer' as containerId.`,
      inputSchema: inputBaseSchema(nodeTypes),
      outputSchema: z.object({ nodeId: z.string() }),
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async ({ roomId, containerId, type, node }) => {
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

      const container = WeaveStateManipulation.getYjsElement(
        roomDocument,
        containerId,
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

      const nodeId = uuidv4();

      const nodeDefaultState = createNodeTypeDefaultState(nodeId, type);

      if (!nodeDefaultState) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Node type ${type} not found.`,
            },
          ],
          structuredContent: {
            error: `Node type ${type} not found.`,
          },
        };
      }

      const nodeProps = node.props as WeaveElementAttributes;
      const nodeState = addNodeState(nodeDefaultState!, nodeProps);

      if (!nodeState) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Unsupported node type ${type}.`,
            },
          ],
          structuredContent: {
            error: `Unsupported node type ${type}.`,
          },
        };
      }

      const { element } = WeaveStateManipulation.mapNodeToYjs(nodeState);
      WeaveStateManipulation.addElements(container, [element]);

      await persistRoomDocument(roomId, roomDocument);

      const NODE_ADDED = {
        nodeId,
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(NODE_ADDED),
          },
        ],
        structuredContent: NODE_ADDED,
      };
    },
  );
};

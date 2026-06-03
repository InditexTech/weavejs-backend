// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { NodeTypeInformation } from "../types.js";

export const registerTool = (
  server: McpServer,
  getAvailableNodes: () => NodeTypeInformation[],
) => {
  server.registerTool(
    "get-node-type-schema",
    {
      title: "Get the schema of a node type",
      description: "Obtain a specific node schema with their description.",
      inputSchema: z.object({
        type: z.string().describe("The identifier of the node."),
      }),
      outputSchema: z.object({
        type: z.string().describe("The identifier of the node."),
        description: z.string().describe("A brief description of the node."),
        schema: z
          .string()
          .describe("The schema of the node, use it to build a node payload."),
      }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async ({ type }) => {
      const availableNodes: {
        types: NodeTypeInformation[];
      } = {
        types: getAvailableNodes(),
      };

      const node = availableNodes.types.find((t) => t.type === type);

      if (!node) {
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

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(node),
          },
        ],
        structuredContent: node,
      };
    },
  );
};

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
    "get-available-node-types",
    {
      title: "Get the available node types",
      description:
        "Obtain all the available node types with their description.",
      outputSchema: z.object({
        types: z.array(
          z.object({
            type: z.string().describe("The identifier of the node."),
            description: z
              .string()
              .describe("A brief description of the node."),
            schema: z
              .string()
              .describe(
                "The schema of the node, use it to build a node payload.",
              ),
          }),
        ),
      }),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        destructiveHint: false,
        openWorldHint: false,
      },
    },
    async () => {
      const availableNodes: {
        types: NodeTypeInformation[];
      } = {
        types: getAvailableNodes(),
      };

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(availableNodes),
          },
        ],
        structuredContent: availableNodes,
      };
    },
  );
};

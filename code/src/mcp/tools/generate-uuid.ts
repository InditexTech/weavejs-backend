// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";

export const registerTool = (server: McpServer) => {
  server.registerTool(
    "generate-uuid",
    {
      title: "Generate an uuid",
      description: "Creates a new uuid.",
      outputSchema: z.object({
        uuid: z.string().describe("The generated uuid."),
      }),
      annotations: {
        readOnlyHint: false,
        idempotentHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async () => {
      const generatedUuid = uuidv4();

      return {
        content: [
          {
            type: "text" as const,
            text: generatedUuid,
          },
        ],
        structuredContent: {
          uuid: generatedUuid,
        },
      };
    },
  );
};

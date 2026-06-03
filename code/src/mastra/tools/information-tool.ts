// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const informationTool = createTool({
  id: "information-tool",
  description:
    "Provide information about the capabilities of the agents and tools available.",
  inputSchema: z.object({
    prompt: z.string().describe("What the user wants to know"),
  }),
  outputSchema: z.object({
    result: z.string().describe("The result of the inquiry"),
  }),
  execute: async (params, context) => {
    const { mastra, writer } = context;
    const logger = context?.mastra?.getLogger();

    logger?.info("[tool][information-tool] called", params);

    if (!mastra) {
      throw new Error("Mastra instance is required in the context");
    }

    const informationAgent = mastra.getAgentById("information-agent");

    if (!informationAgent) {
      throw new Error("Information agent not found");
    }

    logger?.info("[tool][information-tool] executing agent", {
      id: informationAgent.id,
      name: informationAgent.name,
    });

    const stream = await informationAgent.stream([
      {
        role: "system",
        content: `Analyze the the user request, and try to answer it with the information you have about
            the agents and tools capabilities.`,
      },
      {
        role: "user",
        content: `The user request is: ${params.prompt}`,
      },
    ]);

    await stream!.fullStream.pipeTo(writer!);

    const result = await stream!.text;

    logger?.info("[tool][information-tool] result", {
      result,
    });

    return {
      result,
    };
  },
});

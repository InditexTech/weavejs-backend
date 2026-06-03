// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { MCPClient } from "@mastra/mcp";
import { Agent } from "@mastra/core/agent";
import { getMemory } from "../connectors.js";
import { ANALYSIS_MODEL } from "../index.js";

export const getInformationAgent = async () => {
  const memory = await getMemory();

  const testMcpClient = new MCPClient({
    id: "weavejs-mcp-client",
    servers: {
      weavejsLocal: {
        url: new URL(`http://localhost:8081/ai/v1/mcp`),
      },
    },
  });

  return new Agent({
    id: "information-agent",
    name: "Information agent",
    instructions: `
      You're a specialized information agent, your main responsibility is to respond to questions related to
      the abilities you can provide. Provide accurate information based on the tools you have available and
      the information provided.

      You have access to the following tools:

      - Image Information Tool: a tool that can provide metadata information of a given image.
      - Image Generation Tool: a tool that can generate or edit images based on user prompts and reference
        images.
      - Room Edition Tool: a tool that can manipulate the Weave.js room based on a user request.

      NEVER infer or make up information about the tools you have, if you don't know the answer to a question,
      respond with "I don't know".
    `,
    model: ANALYSIS_MODEL,
    tools: await testMcpClient.listTools(),
    memory,
  });
};

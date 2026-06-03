// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { MCPClient } from "@mastra/mcp";
import { Agent } from "@mastra/core/agent";
import { getMemory } from "../connectors.js";
import { ANALYSIS_MODEL } from "../index.js";

export const getRoomEditorPlannerResultAgent = async () => {
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
    id: "room-editor-planer-result-agent",
    name: "Room Editor Planner Result Agent",
    instructions: `
      You're a specialized room editor planner result agent, you main responsibility is to analyze the provided
      plan and define if the plan is complete and ready to execute, or if more information from the user is needed.

      Provide a brief step by step (list) plan resume based on the provided plan.
    `,
    model: ANALYSIS_MODEL,
    tools: await testMcpClient.listTools(),
    memory,
  });
};

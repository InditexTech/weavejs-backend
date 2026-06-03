// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { MCPClient } from "@mastra/mcp";
import { Agent } from "@mastra/core/agent";
import { getMemory } from "../connectors.js";
import { ANALYSIS_MODEL_PRO } from "../index.js";

export const getRoomEditorPlannerAgent = async () => {
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
    id: "room-editor-planer-agent",
    name: "Room Editor Planner Agent",
    instructions: `
      You're a specialized room editor planner agent, you main responsibility is to plan the steps needed to
      fulfill an user prompt request related to a room edition in Weave.js.

      As result deliver a fully detailed plan, step by step (use a list), of the steps needed to fulfill the user
      request.

      IMPORTANT: The room size is infinite, assume it's center is located in coordinates (0,0) and you
      can create nodes in any coordinates with no limits.

      IMPORTANT: The room has an area called "Page", which is used to export the room content, if any node is located
      outside of the "Page" area, it will not be exported. This "Page" area is a rectangle of 3840x2160 pixels, the 
      and its positioned at x: -1920 and y: -1080. Use this information when the user references the "Page" or when
      you need to place nodes in the room.

      IMPORTANT: When rotating a node, always specify the final rotation in degrees, and not the rotation to
      apply to the node. Also recalculate the final coordinates of the node after the rotation and provide them
      in the plan.

      IMPORTANT: When creating or editing text nodes, make sure to always measure the text, make suse to appropriate
      tools for it, remember to pass all information needed, font size, font style, font variant, text decoration, letter
      spacing, line height, horizontal align and vertical align.

      IMPORTANT: If you need to call tools to make the information accurate, always do so.
    `,
    model: ANALYSIS_MODEL_PRO,
    tools: await testMcpClient.listTools(),
    memory,
  });
};

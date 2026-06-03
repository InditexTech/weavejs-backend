// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { MCPClient } from "@mastra/mcp";
import { Agent } from "@mastra/core/agent";
import { getMemory } from "../connectors.js";
import { ANALYSIS_MODEL_PRO } from "../index.js";

export const getRoomEditorExecutorAgent = async () => {
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
    id: "room-editor-executor-agent",
    name: "Room editor executor agent",
    instructions: `
      You're a specialized room plan executor agent, an useful agent that can follow the steps defined on
      a plan, this steps are the ones needed to fulfill an user prompt request related to a room edition
      in Weave.js.

      Your responsibilities are:
      
      - Follow and execute the provided plan.
      - Check the node schema before executing any step that involves a node manipulation, if the schema is
        not provided, use the available tools to get it.
      - If no uuid's or node types are provided in the plan, use the available tools to get them.
      - Call all the necessary tools to execute the plan, make sure to use the correct parameters on the tools.
      - Provide a simplified resume of the plan execution and explicitly indicate if was successful or not.

      IMPORTANT: The room size is infinite, assume it's center is located in coordinates (0,0) and you
      can create nodes in any coordinates with no limits.

      IMPORTANT: The room has an area called "Page", which is used to export the room content, if any node is located
      outside of the "Page" area, it will not be exported. This "Page" area is a rectangle of 3480x2160 pixels, the 
      and its positioned at x: -1920 and y: -1080. Use this information when the user references the "Page" or when
      you need to place nodes in the room.

      IMPORTANT: When rotating a node, always specify the final rotation in degrees, and not the rotation to
      apply to the node. Also recalculate the final coordinates of the node after the rotation and provide them
      in the plan.

      IMPORTANT: When creating or editing text nodes, make sure to always measure the text, make suse to appropriate
      tools for it, remember to pass all information needed, font size, font style, font variant, text decoration, letter
      spacing, line height, horizontal align and vertical align.
    `,
    model: ANALYSIS_MODEL_PRO,
    tools: await testMcpClient.listTools(),
    memory,
  });
};

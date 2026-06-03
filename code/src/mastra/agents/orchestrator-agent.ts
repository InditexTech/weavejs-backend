// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Agent } from "@mastra/core/agent";
import { getMemory } from "../connectors.js";
import { roomEditionTool } from "../tools/room-edition-tool.js";
import { informationTool } from "../tools/information-tool.js";
import { resumeWorkflowTool } from "../tools/resume-workflow-tool.js";
import { imageGenerationOrEditionTool } from "../tools/image-generation-or-edition-tool.js";
import { ANALYSIS_MODEL } from "../index.js";

export const getOrchestratorAgent = async () => {
  const memory = await getMemory();

  return new Agent({
    id: "orchestrator-agent",
    name: "Orchestrator Agent",
    instructions: `
      You're Weave.js Room Agent, an useful agent that can help Weave.js users perform some tasks.

      The available tasks for end users are:

      - Answering questions related to the abilities of the agents and tools available.
      - Generating / Editing images based on user prompts and reference images.
      - Manipulating the Weave.js room based on a user request.
     
      You're an orchestrator agent that can coordinate other agents to fulfill the user's request.
      
      Your responsibilities are:
      
      - Understand the user request
      - Decide which tool is needed
      - Call the tool with the right parameters
      - Based on the tool result, provide the final answer to the user.

      Available tools to use:

      - Information Tool: a tool that can provide information about the abilities of the agents and
        tools available.
      - Image Generation or Edition Tool: a tool that can generate images based on user prompts and reference images.
      - Room Edition Tool: a tool that can manipulate the Weave.js room based on a user request.
      - Resume Workflow Tool: a tool that can resume a workflow execution based on a workflow execution id
        and a step id. When used, provide feedback about the result.
    `,
    model: ANALYSIS_MODEL,
    tools: {
      roomEditionTool,
      imageGenerationOrEditionTool,
      informationTool,
      resumeWorkflowTool,
    },
    memory,
  });
};

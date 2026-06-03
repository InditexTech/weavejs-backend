// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Mastra } from "@mastra/core/mastra";
import { PinoLogger } from "@mastra/loggers";
import { getStorage } from "./connectors.js";
import { getOrchestratorAgent } from "./agents/orchestrator-agent.js";
import { getInformationAgent } from "./agents/information-agent.js";
import { getImageGenerationOrEditionPlannerAgent } from "./agents/image-generation-or-edition-planner-agent.js";
import { getRoomEditorPlannerAgent } from "./agents/room-editor-planner-agent.js";
import { getRoomEditorExecutorAgent } from "./agents/room-editor-executor-agent.js";
import { getResultSummaryAgent } from "./agents/result-summary-agent.js";
import { getRoomEditionWorkflow } from "./workflows/room-edition-workflow/index.js";
import { getImageGenerationOrEditionWorkflow } from "./workflows/image-generation-or-edition-workflow/index.js";
import { workflowRoute } from "@mastra/ai-sdk";

let mastra: Mastra | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const agents: Record<string, any> = [];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const workflows: Record<string, any> = [];

export const ANALYSIS_MODEL_PRO = "google/gemini-3.1-pro-preview";
export const ANALYSIS_MODEL = "google/gemini-3.5-flash";

export const getMastra = async () => {
  if (!mastra) {
    try {
      // Ensure storage is initialized
      const storage = await getStorage();

      // Ensure agents are initialized
      const orchestratorAgent = await getOrchestratorAgent();
      agents["orchestratorAgent"] = orchestratorAgent;

      const informationAgent = await getInformationAgent();
      agents["informationAgent"] = informationAgent;

      const roomEditorExecutorAgent = await getRoomEditorExecutorAgent();
      agents["roomEditorExecutorAgent"] = roomEditorExecutorAgent;
      const roomEditorPlannerAgent = await getRoomEditorPlannerAgent();
      agents["roomEditorPlannerAgent"] = roomEditorPlannerAgent;
      const resultSummaryAgent = await getResultSummaryAgent();
      agents["resultSummaryAgent"] = resultSummaryAgent;

      const imageGenerationOrEditionPlannerAgent =
        await getImageGenerationOrEditionPlannerAgent();
      agents["imageGenerationOrEditionPlannerAgent"] =
        imageGenerationOrEditionPlannerAgent;

      // Ensure workflows are initialized
      const imageGenerationOrEditionWorkflow = (
        await getImageGenerationOrEditionWorkflow(agents)
      )();
      workflows["imageGenerationOrEditionWorkflow"] =
        imageGenerationOrEditionWorkflow;

      const roomEditionWorkflow = (await getRoomEditionWorkflow(agents))();
      workflows["roomEditionWorkflow"] = roomEditionWorkflow;

      mastra = new Mastra({
        agents: {
          orchestratorAgent,
          informationAgent,
          imageGenerationOrEditionPlannerAgent,
          roomEditorExecutorAgent,
          roomEditorPlannerAgent,
          resultSummaryAgent,
        },
        workflows: {
          roomEditionWorkflow,
          imageGenerationOrEditionWorkflow,
        },
        storage,
        logger: new PinoLogger({
          name: "Mastra",
          level: "info",
        }),
        server: {
          apiRoutes: [
            workflowRoute({
              path: "/workflow/:workflowId",
            }),
          ],
        },
      });
    } catch (error) {
      console.error("Error initializing Mastra:", error);
      throw error;
    }
  }

  return mastra;
};

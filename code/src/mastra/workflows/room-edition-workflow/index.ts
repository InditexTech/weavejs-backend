// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { createWorkflow } from "@mastra/core/workflows";
import { createPlanStep } from "./steps/plan.js";
import { createPlanConfirmationStep } from "./steps/plan-confirmation.js";
import { createExecutionStep } from "./steps/execution.js";
import { createResultsSummaryStep } from "./steps/results-summary.js";
import { createReferencesExtractionStep } from "./steps/references-extraction.js";
import { imageReferenceSchema } from "./schemas.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getRoomEditionWorkflow(agents: any): Promise<any> {
  const referencesExtractionStep = await createReferencesExtractionStep(
    agents.roomEditorPlannerAgent,
  );
  const planStep = await createPlanStep(agents.roomEditorPlannerAgent);

  const planConfirmationStep = await createPlanConfirmationStep();

  const executionStep = await createExecutionStep(
    agents.roomEditorExecutorAgent,
    agents.roomEditorPlannerAgent,
  );

  const resultsSummaryStep = await createResultsSummaryStep(
    agents.resultSummaryAgent,
  );

  const wf = () => {
    return createWorkflow({
      id: "room-edition-workflow",
      inputSchema: z.object({
        message: z.string(),
        referenceNodes: z.array(
          z.object({
            nodeId: z.string(),
            nodeType: z.string(),
          }),
        ),
      }),
      outputSchema: z.object({
        output: z.string(),
      }),
      stateSchema: z.object({
        originalMessage: z.string(),
        roomId: z.string(),
        pageId: z.string(),
        referenceImages: z.array(imageReferenceSchema),
        referenceNodesInformation: z.array(z.any()),
        imagesInformation: z.array(z.any()),
      }),
    })
      .then(referencesExtractionStep)
      .then(planStep)
      .map(async ({ getInitData, getStepResult }) => {
        const initData = getInitData<{
          message: string;
        }>();
        const stepResults = getStepResult(planStep);

        const { status, question, result, plan } = stepResults;

        return {
          message: initData.message,
          result,
          plan,
          status,
          question,
        };
      })
      .then(planConfirmationStep)
      .then(executionStep)
      .then(resultsSummaryStep)
      .commit();
  };

  return wf;
}

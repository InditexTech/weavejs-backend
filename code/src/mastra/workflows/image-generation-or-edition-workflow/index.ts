// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { createWorkflow } from "@mastra/core/workflows";
import { createPlanStep } from "./steps/plan.js";
import { createPlanConfirmationStep } from "./steps/plan-confirmation.js";
import { createExecutionStep } from "./steps/execution.js";
import { createResultsSummaryStep } from "./steps/results-summary.js";
import { imageOptionSchema, imageReferenceSchema } from "./schemas.js";

export async function getImageGenerationOrEditionWorkflow(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  agents: any,
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const planStep = await createPlanStep(
    agents.imageGenerationOrEditionPlannerAgent,
  );

  const planConfirmationStep = await createPlanConfirmationStep();

  const executionStep = await createExecutionStep();

  const resultsSummaryStep = await createResultsSummaryStep(
    agents.resultSummaryAgent,
  );

  const wf = () => {
    return createWorkflow({
      id: "image-generation-or-edit-workflow",
      inputSchema: z.object({
        message: z.string(),
      }),
      outputSchema: z.object({
        output: z.string(),
      }),
      stateSchema: z.object({
        originalMessage: z.string(),
        roomId: z.string(),
        threadId: z.string(),
        resourceId: z.string(),
        imageOption: imageOptionSchema,
        referenceImages: z.array(imageReferenceSchema),
      }),
    })
      .then(planStep)
      .then(planConfirmationStep)
      .then(executionStep)
      .then(resultsSummaryStep)
      .commit();
  };

  return wf;
}

// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { createStep } from "@mastra/core/workflows";
import { z } from "zod";

export const createPlanConfirmationStep = async () => {
  return createStep({
    id: "image-generation-or-edition-plan-confirmation",
    inputSchema: z.object({
      prompt: z.string(),
      result: z.string(),
      plan: z.string(),
      status: z.enum(["user_decision", "ask_for_information"]),
      question: z.string(),
    }),
    outputSchema: z.object({
      prompt: z.string(),
      plan: z.string(),
      result: z.string(),
    }),
    resumeSchema: z.object({
      approved: z.boolean(),
    }),
    suspendSchema: z.object({
      kind: z.enum(["user_decision", "ask_for_information"]),
      question: z.string(),
      plan: z.string(),
      workflowName: z.string(),
      result: z.string(),
    }),
    stateSchema: z.object({
      roomId: z.string(),
      originalMessage: z.string(),
    }),
    execute: async ({ inputData, mastra, resumeData, suspend, bail }) => {
      const { plan, status, question, prompt } = inputData;
      const { approved } = resumeData ?? {};

      const logger = mastra?.getLogger();

      logger?.info(
        `[workflow][image-generation-or-edit-workflow.plan-confirmation] called`,
        {
          prompt,
          plan,
          status,
          question,
          approved,
        },
      );

      if (status === "user_decision" && approved === false) {
        return await bail({
          result: "User rejected the plan.",
        });
      }

      if (status === "user_decision" && !approved) {
        return await suspend({
          plan,
          kind: status,
          question,
          workflowName: "imageGenerationOrEditionWorkflow",
          result: "Plan needs user approval.",
        });
      }

      if (status === "ask_for_information" && !approved) {
        return await suspend({
          plan,
          kind: status,
          question,
          workflowName: "imageGenerationOrEditionWorkflow",
          result: "Need more information from the user.",
        });
      }

      return { prompt, plan, result: "User approved the plan." };
    },
  });
};

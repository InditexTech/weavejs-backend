// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { getMemory } from "@/mastra/connectors.js";
import { createStep } from "@mastra/core/workflows";
import { IMAGE_GENERATION_OR_EDITION_STATUS } from "./execution.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createResultsSummaryStep = async (resultSummaryAgent: any) => {
  const memory = await getMemory();

  return createStep({
    id: "image-generation-or-edition-result-summary",
    inputSchema: z.object({
      status: z.enum(Object.values(IMAGE_GENERATION_OR_EDITION_STATUS)),
      images: z.array(
        z.object({
          imageId: z.string(),
          status: z.enum([
            "generating",
            "generated",
            "prohibited_content",
            "failed",
          ]),
          url: z.string().optional(),
        }),
      ),
      plan: z.string(),
    }),
    outputSchema: z.object({
      result: z.string(),
    }),
    stateSchema: z.object({
      originalMessage: z.string(),
    }),
    execute: async ({ inputData, mastra, state, requestContext, writer }) => {
      const { status, images, plan } = inputData;
      const { originalMessage } = state;

      const logger = mastra?.getLogger();

      logger?.info(
        `[workflow][image-generation-or-edit-workflow.results-summary] called`,
        {
          status,
          images,
          plan,
        },
      );

      const tasks = [
        {
          id: "generate_summary",
          name: "Analyze the plan and execution to generate a summary",
          status: "running",
        },
      ];

      const tasksMessageId = uuidv4();
      await writer?.custom({
        id: tasksMessageId,
        type: "data-workflow-step-event",
        data: {
          workflowId: "image-generation-or-edit-workflow",
          stepId: "image-generation-or-edition-result-summary",
          title: "Summary tasks",
          tasks: tasks,
          transient: true,
        },
      });

      const stream = await resultSummaryAgent.stream(
        [
          {
            role: "system",
            content: `Analyze the following user request, plan and execution result, define if the execution is
            complete or partially complete, and summarize the execution result with details about the execution
            and the final state of the room after the execution.`,
          },
          {
            role: "user",
            content: `The user request is: ${originalMessage}`,
          },
          {
            role: "user",
            content: `The executed plan is: ${plan}`,
          },
          {
            role: "user",
            content: `The execution result are the following images: ${JSON.stringify(
              images,
              null,
              2,
            )}`,
          },
        ],
        {
          memory,
          requestContext,
        },
      );

      await stream!.fullStream.pipeTo(writer!);

      const summary = await stream!.text;

      tasks[0].status = "completed";
      await writer?.custom({
        id: tasksMessageId,
        type: "data-workflow-step-event",
        data: {
          workflowId: "image-generation-or-edit-workflow",
          stepId: "image-generation-or-edition-result-summary",
          title: "Summary tasks",
          tasks: tasks,
          transient: true,
        },
      });

      logger?.info(
        `[workflow][image-generation-or-edit-workflow.results-summary] summary obtained`,
        {
          status,
          summary,
        },
      );

      return {
        output:
          status === "success"
            ? "Image generation or edition successful."
            : "Image generation or edition failed.",
        result: summary,
      };
    },
  });
};

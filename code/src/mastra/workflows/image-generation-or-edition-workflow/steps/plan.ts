// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import { createStep } from "@mastra/core/workflows";
import { getMemory } from "@/mastra/connectors.js";
import { z } from "zod";
import { imageOptionSchema, imageReferenceSchema } from "../schemas.js";
import { ANALYSIS_MODEL } from "@/mastra/index.js";

export const createPlanStep = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  imageGenerationOrEditionPlannerAgent: any,
) => {
  const memory = await getMemory();

  return createStep({
    id: "image-generation-or-edition-plan",
    inputSchema: z.object({
      message: z.string(),
    }),
    outputSchema: z.object({
      status: z.enum(["user_decision", "ask_for_information"]),
      prompt: z.string(),
      question: z.string(),
      result: z.string(),
      plan: z.string(),
    }),
    stateSchema: z.object({
      roomId: z.string(),
      threadId: z.string(),
      resourceId: z.string(),
      imageOption: imageOptionSchema,
      referenceImages: z.array(imageReferenceSchema),
      originalMessage: z.string(),
    }),
    execute: async ({ inputData, mastra, state, writer }) => {
      const { message } = inputData;
      const { roomId, imageOption, referenceImages } = state;
      const { originalMessage } = state;

      const logger = mastra?.getLogger();

      logger?.info(
        `[workflow][image-generation-or-edit-workflow.plan] called`,
        {
          message,
          imageOption,
          roomId,
        },
      );

      const tasks = [
        {
          id: "analyze_request",
          name: "Analyze the user request and define the plan to execute",
          status: "running",
        },
        {
          id: "analyze_plan",
          name: "Analyze the projected plan",
          status: "idle",
        },
      ];

      const tasksMessageId = uuidv4();
      await writer?.custom({
        id: tasksMessageId,
        type: "data-workflow-step-event",
        data: {
          workflowId: "image-generation-or-edit-workflow",
          stepId: "image-generation-or-edition-plan",
          title: "Planning tasks",
          tasks: tasks,
          transient: true,
        },
      });

      const planStream = await imageGenerationOrEditionPlannerAgent.stream(
        [
          {
            role: "system",
            content: `Analyze the the user request, process it and define what consist the image generation or
            edition process.`,
          },
          {
            role: "user",
            content: `The amount of reference images are: ${referenceImages.length}`,
          },
          {
            role: "user",
            content: `The user request is: ${message}`,
          },
        ],
        {
          memory,
        },
      );

      await planStream!.fullStream.pipeTo(writer!, { preventClose: true });

      const plan = await planStream!.text;

      tasks[0].status = "completed";
      await writer?.custom({
        id: tasksMessageId,
        type: "data-workflow-step-event",
        data: {
          workflowId: "image-generation-or-edit-workflow",
          stepId: "image-generation-or-edition-plan",
          title: "Planning tasks",
          tasks: tasks,
          transient: true,
        },
      });

      logger?.info(
        `[workflow][image-generation-or-edit-workflow.plan] plan obtained`,
        {
          plan,
        },
      );

      tasks[1].status = "running";
      await writer?.custom({
        id: tasksMessageId,
        type: "data-workflow-step-event",
        data: {
          workflowId: "image-generation-or-edit-workflow",
          stepId: "image-generation-or-edition-plan",
          title: "Planning tasks",
          tasks: tasks,
          transient: true,
        },
      });

      const planAnalysisStream =
        await imageGenerationOrEditionPlannerAgent.stream(
          [
            {
              role: "system",
              content: `Analyze the the projected plan to generate or edit an image.
            
            If the plan is fully defined, return 'user_decision' and the prompt to use.

            If the plan is not defined and more information is needed, return 'ask_for_information' and the
            question to ask the user to clarify the plan and make it executable.
            
            Always try to be as accurate as possible analyzing the plan, the more accurate you are,
            the better the execution will be.`,
            },
            {
              role: "user",
              content: `The user request is: ${originalMessage}`,
            },
            {
              role: "user",
              content: `The projected plan is: ${plan}`,
            },
          ],
          {
            memory,
            structuredOutput: {
              schema: z.object({
                prompt: z
                  .string()
                  .describe("The prompt to generate or edit the image"),
                question: z
                  .string()
                  .describe(
                    "Question to ask the user, if the status is 'user_decision' as to approve or reject the execution of the plan, if the status is 'ask_for_information' as for the necessary information to clarify the plan and make it executable",
                  ),
                status: z
                  .enum(["user_decision", "ask_for_information"])
                  .describe(
                    "The status of the plan, it can 'user_decision' if the plan is complete but needs approval to execute from the user, or 'ask_for_information' if more information is needed from the user to define the plan",
                  ),
              }),
              model: ANALYSIS_MODEL,
              useAgent: true,
            },
          },
        );

      await planAnalysisStream!.fullStream.pipeTo(writer!, {
        preventClose: true,
      });

      const structuredOutput = await planAnalysisStream!.object;

      tasks[1].status = "completed";
      await writer?.custom({
        id: tasksMessageId,
        type: "data-workflow-step-event",
        data: {
          workflowId: "image-generation-or-edit-workflow",
          stepId: "image-generation-or-edition-plan",
          title: "Planning tasks",
          tasks: tasks,
          transient: true,
        },
      });

      logger?.info(
        `[workflow][image-generation-or-edit-workflow.plan] plan analysis`,
        {
          output: structuredOutput,
        },
      );

      await writer?.close();

      let result = "Plan defined.";
      if (structuredOutput.status === "user_decision") {
        result = "Plan needs approval.";
      }
      if (structuredOutput.status === "ask_for_information") {
        result = "More information is needed to clarify the plan.";
      }

      return {
        ...structuredOutput,
        result,
        plan,
      };
    },
  });
};

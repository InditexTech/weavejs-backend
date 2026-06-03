// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import { getMemory } from "@/mastra/connectors.js";
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { CallTool, Task } from "@/mastra/types.js";
import { ANALYSIS_MODEL_PRO } from "@/mastra/index.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createPlanStep = async (roomEditorPlannerAgent: any) => {
  const memory = await getMemory();

  return createStep({
    id: "room-edition-plan",
    inputSchema: z.object({
      message: z.string(),
    }),
    outputSchema: z.object({
      status: z.enum(["user_decision", "ask_for_information"]),
      question: z.string(),
      result: z.string(),
      plan: z.string(),
    }),
    stateSchema: z.object({
      pageId: z.string(),
      originalMessage: z.string(),
      referenceNodesInformation: z.array(z.any()),
      imagesInformation: z.array(z.any()),
    }),
    execute: async ({ inputData, mastra, state, writer }) => {
      const { message } = inputData;
      const { pageId, referenceNodesInformation } = state;
      const { originalMessage, imagesInformation } = state;

      const logger = mastra?.getLogger();

      logger?.info(`[workflow][room-edition-workflow.plan] called`, {
        message,
      });

      const tasks: Task[] = [
        {
          id: "analyze_request",
          name: "Analyze the user request and define the plan to execute",
          status: "running",
          tools: [],
        },
        {
          id: "analyze_plan",
          name: "Analyze the projected plan",
          status: "idle",
          tools: [],
        },
      ];

      const tasksMessageId = uuidv4();
      await writer?.custom({
        id: tasksMessageId,
        type: "data-workflow-step-event",
        data: {
          workflowId: "room-edition-workflow",
          stepId: "room-edition-plan",
          title: "Planning tasks",
          tasks,
          transient: true,
        },
      });

      const planStream = await roomEditorPlannerAgent.stream(
        [
          {
            role: "system",
            content: `Analyze the the user request, process it and define an execution plan.
            
            NEVER use any default values unless they are provided by the nodes schemas. Use tools to find the
            accurate information if needed, but NEVER infer any information that is not provided in the user
            prompt or on the tools.

            If something fails, please be explicit about what is failing and what information is missing to
            define the plan correctly.
            
            IMPORTANT: If you need more information to perform a correct plan, ask for it explicitly in the
            plan result, specifying what information is needed.`,
          },
          {
            role: "user",
            content: `The user request is: ${message}`,
          },
          {
            role: "user",
            content: `The attached images are: ${JSON.stringify(imagesInformation, null, 2)}`,
          },
          {
            role: "user",
            content: `The referenced nodes are the following: ${JSON.stringify(referenceNodesInformation, null, 2)}`,
          },
          {
            role: "user",
            content: `The room to edit is: ${pageId}.`,
          },
        ],
        {
          memory,
        },
      );

      for await (const chunk of planStream!.fullStream) {
        if (chunk.type === "tool-call") {
          tasks[0].tools.push({
            toolCallId: chunk.payload.toolCallId,
            toolName: chunk.payload.toolName,
            type: chunk.type,
            args: chunk.payload.args,
            status: "input-available",
          });

          await writer?.custom({
            id: tasksMessageId,
            type: "data-workflow-step-event",
            data: {
              workflowId: "room-edition-workflow",
              stepId: "room-edition-plan",
              title: "Planning tasks",
              tasks,
              transient: true,
            },
          });
        }
        if (chunk.type === "tool-result") {
          const toolCallIndex: number = tasks[0].tools.findIndex(
            (call: CallTool) => call.toolCallId === chunk.payload.toolCallId,
          );

          if (toolCallIndex !== -1) {
            tasks[0].tools[toolCallIndex] = {
              ...tasks[0].tools[toolCallIndex],
              type: chunk.type,
              result: chunk.payload.result,
              status: "output-available",
            };

            await writer?.custom({
              id: tasksMessageId,
              type: "data-workflow-step-event",
              data: {
                workflowId: "room-edition-workflow",
                stepId: "room-edition-plan",
                title: "Planning tasks",
                tasks,
                transient: true,
              },
            });
          }
        }
        writer?.write(chunk);
      }

      const plan = await planStream!.text;

      tasks[0].status = "completed";
      await writer?.custom({
        id: tasksMessageId,
        type: "data-workflow-step-event",
        data: {
          workflowId: "room-edition-workflow",
          stepId: "room-edition-plan",
          title: "Planning tasks",
          tasks,
          transient: true,
        },
      });

      logger?.info(`[workflow][room-edition-workflow.plan] plan obtained`, {
        plan,
      });

      tasks[1].status = "running";
      await writer?.custom({
        id: tasksMessageId,
        type: "data-workflow-step-event",
        data: {
          workflowId: "room-edition-workflow",
          stepId: "room-edition-plan",
          title: "Planning tasks",
          tasks: tasks,
          transient: true,
        },
      });

      const planAnalysisStream = await roomEditorPlannerAgent.stream(
        [
          {
            role: "system",
            content: `Analyze the the projected plan.
            
            If the plan is fully defined, return 'user_decision'.

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
            model: ANALYSIS_MODEL_PRO,
            useAgent: true,
          },
        },
      );

      for await (const chunk of planAnalysisStream!.fullStream) {
        if (chunk.type === "tool-call") {
          tasks[1].tools.push({
            toolCallId: chunk.payload.toolCallId,
            toolName: chunk.payload.toolName,
            type: chunk.type,
            args: chunk.payload.args,
            status: "input-available",
          });

          await writer?.custom({
            id: tasksMessageId,
            type: "data-workflow-step-event",
            data: {
              workflowId: "room-edition-workflow",
              stepId: "room-edition-plan",
              title: "Planning tasks",
              tasks: tasks,
              transient: true,
            },
          });
        }
        if (chunk.type === "tool-result") {
          const toolCallIndex: number = tasks[1].tools.findIndex(
            (call: CallTool) => call.toolCallId === chunk.payload.toolCallId,
          );

          if (toolCallIndex !== -1) {
            tasks[1].tools[toolCallIndex] = {
              ...tasks[1].tools[toolCallIndex],
              type: chunk.type,
              result: chunk.payload.result,
              status: "output-available",
            };

            await writer?.custom({
              id: tasksMessageId,
              type: "data-workflow-step-event",
              data: {
                workflowId: "room-edition-workflow",
                stepId: "room-edition-plan",
                title: "Planning tasks",
                tasks,
                transient: true,
              },
            });
          }
        }
        writer?.write(chunk);
      }

      const structuredOutput = await planAnalysisStream!.object;

      tasks[1].status = "completed";
      await writer?.custom({
        id: tasksMessageId,
        type: "data-workflow-step-event",
        data: {
          workflowId: "room-edition-workflow",
          stepId: "room-edition-plan",
          title: "Planning tasks",
          tasks: tasks,
          transient: true,
        },
      });

      logger?.info(`[workflow][room-edition-workflow.plan] plan analysis`, {
        output: structuredOutput,
      });

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

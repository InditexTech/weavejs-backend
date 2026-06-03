// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import { getMemory } from "@/mastra/connectors.js";
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { CallTool, Task } from "@/mastra/types.js";
import { ANALYSIS_MODEL } from "@/mastra/index.js";

export const createExecutionStep = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  roomEditorExecutorAgent: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  roomEditorPlannerAgent: any,
) => {
  const memory = await getMemory();

  return createStep({
    id: "room-edition-execution",
    inputSchema: z.object({
      message: z.string(),
      plan: z.string(),
    }),
    outputSchema: z.object({
      status: z.enum(["success", "failure"]),
      result: z.string(),
      plan: z.string(),
      execution: z.string(),
    }),
    stateSchema: z.object({
      pageId: z.string(),
      originalMessage: z.string(),
      referenceNodesInformation: z.array(z.any()),
      imagesInformation: z.array(z.any()),
    }),
    execute: async ({ inputData, mastra, state, writer }) => {
      const { message, plan } = inputData;
      const { imagesInformation, referenceNodesInformation } = state;

      const logger = mastra?.getLogger();

      logger?.info(`[workflow][room-edition-workflow.execution] called`, {
        message,
        plan,
      });

      const tasks: Task[] = [
        {
          id: "execute_plan",
          name: "Execute the provided plan",
          status: "running",
          tools: [],
        },
        {
          id: "analyze_plan",
          name: "Analyze the plan execution result",
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
          stepId: "room-edition-execution",
          title: "Execution tasks",
          tasks: tasks,
          transient: true,
        },
      });

      const stream = await roomEditorExecutorAgent.stream(
        [
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
            content: `The room to edit is: ${state.pageId}`,
          },
          {
            role: "user",
            content: `The plan to execute is: ${plan}`,
          },
          {
            role: "user",
            content: `Always return a detailed explanation of the execution of the plan, step by step,
            and define if the plan execution was successful or not.`,
          },
        ],
        {
          memory,
          structuredOutput: {
            schema: z.object({
              status: z.enum(["success", "failure"]),
            }),
            model: ANALYSIS_MODEL,
            useAgent: true,
          },
        },
      );

      for await (const chunk of stream!.fullStream) {
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
              stepId: "room-edition-execution",
              title: "Execution tasks",
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
                stepId: "room-edition-execution",
                title: "Execution tasks",
                tasks,
                transient: true,
              },
            });
          }
        }
        writer?.write(chunk);
      }

      const execution = await stream!.text;

      tasks[0].status = "completed";
      await writer?.custom({
        id: tasksMessageId,
        type: "data-workflow-step-event",
        data: {
          workflowId: "room-edition-workflow",
          stepId: "room-edition-execution",
          title: "Execution tasks",
          tasks: tasks,
          transient: true,
        },
      });

      logger?.info(
        `[workflow][image-generation-or-edit-workflow.plan] plan execution obtained`,
        {
          execution,
        },
      );

      tasks[1].status = "running";
      await writer?.custom({
        id: tasksMessageId,
        type: "data-workflow-step-event",
        data: {
          workflowId: "room-edition-workflow",
          stepId: "room-edition-execution",
          title: "Execution tasks",
          tasks: tasks,
          transient: true,
        },
      });

      const executionAnalysisStream = await roomEditorPlannerAgent.stream(
        [
          {
            role: "system",
            content: `Analyze the the plan execution.
            
            IMPORTANT: Do not call any tools, just analyze the execution and return if the execution was
            successful or not.
                  
            If the plan executed OK, return 'success'.

            If the plan failed to execute, return 'failure' and the reason why it failed.
            `,
          },
          {
            role: "user",
            content: `The user request is: ${message}`,
          },
          {
            role: "user",
            content: `The plan is: ${plan}`,
          },
          {
            role: "user",
            content: `The execution is: ${execution}`,
          },
        ],
        {
          memory,
          structuredOutput: {
            schema: z.object({
              reason: z
                .string()
                .optional()
                .describe(
                  "The reason why the plan execution failed, only provide this if the status is 'failure'",
                ),
              status: z
                .enum(["success", "failure"])
                .describe(
                  "The status of the execution plan, 'success' if the plan is executed OK, or 'failure' if the plan failed to execute, in this case provide the reason why it failed",
                ),
            }),
            model: ANALYSIS_MODEL,
            useAgent: true,
          },
        },
      );

      for await (const chunk of executionAnalysisStream!.fullStream) {
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
              stepId: "room-edition-execution",
              title: "Execution tasks",
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
                stepId: "room-edition-execution",
                title: "Execution tasks",
                tasks,
                transient: true,
              },
            });
          }
        }
        writer?.write(chunk);
      }

      const structuredOutput = await executionAnalysisStream!.object;

      tasks[1].status = "completed";
      await writer?.custom({
        id: tasksMessageId,
        type: "data-workflow-step-event",
        data: {
          workflowId: "room-edition-workflow",
          stepId: "room-edition-execution",
          title: "Execution tasks",
          tasks: tasks,
          transient: true,
        },
      });

      logger?.info(
        `[workflow][image-generation-or-edit-workflow.plan] execution analysis`,
        {
          output: structuredOutput,
        },
      );

      await writer?.close();

      return {
        status: structuredOutput.status,
        result:
          structuredOutput.status === "success"
            ? "Plan execution success."
            : "Plan execution failed.",
        plan,
        execution,
      };
    },
  });
};

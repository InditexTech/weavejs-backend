// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { createTool } from "@mastra/core/tools";
import { createWorkflowStateReader } from "@mastra/core/workflows";
import { z } from "zod";

const EXECUTION_STATUS = {
  RESUMED: "resumed",
  EXECUTION_NOT_FOUND: "execution-not-found",
  EXECUTION_NOT_SUSPENDED: "execution-not-suspended",
  WORKFLOW_NOT_FOUND: "workflow-not-found",
} as const;

export const resumeWorkflowTool = createTool({
  id: "resume-workflow-tool",
  description:
    "Resumes a workflow execution based on a workflow execution id and a step id.",
  inputSchema: z.object({
    workflowName: z.string().describe("The name of the workflow to resume"),
    executionId: z
      .string()
      .describe("The id of the workflow execution to resume"),
    approved: z.boolean().describe("Whether the step is approved or not"),
  }),
  outputSchema: z.object({
    status: z
      .enum(Object.values(EXECUTION_STATUS))
      .describe(
        "Whether the workflow was resumed, no workflow execution was found, or no workflow was found with the given parameters",
      ),
    reason: z
      .string()
      .describe("The reason why the workflow was resumed or not"),
  }),
  execute: async (params, context) => {
    const logger = context?.mastra?.getLogger();

    logger?.info("[tool][resume-workflow-tool] called", params);

    const mastra = context.mastra;

    if (!mastra) {
      throw new Error("Mastra instance is required in the context");
    }

    const { workflowName, executionId, approved } = params;

    const workflow = mastra.getWorkflow(workflowName);

    if (workflow) {
      const state = await workflow.getWorkflowRunById(executionId);

      if (state?.status === "suspended") {
        const reader = createWorkflowStateReader(state);
        const suspendedStep = reader.getSuspendedStep();
        const approvalLabel = reader.getResumeLabel("approve");
        const run = await workflow.createRun({ runId: state.runId });

        if (!run) {
          return {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            status: "execution-not-found" as any,
            reason: `Workflow run with id ${executionId} not found`,
          };
        }

        logger?.info("[tool][resume-workflow-tool] resuming workflow", {
          executionId: state.runId,
          workflowName: workflow.name,
          suspendedStep: suspendedStep?.path,
          approved,
        });

        const stream = await run.resumeStream({
          step: suspendedStep?.path,
          resumeData: {
            approved,
          },
          forEachIndex: approvalLabel?.foreachIndex,
        });

        await stream!.fullStream.pipeTo(context.writer!);

        const result = await stream!.result;

        logger?.info("[tool][resume-workflow-tool] result status", {
          status: result.status,
        });

        return {
          status: EXECUTION_STATUS.RESUMED,
          reason: "Workflow resumed successfully.",
        };
      } else {
        logger?.info(
          "[tool][resume-workflow-tool] failed to resume, execution not suspended",
          {
            id: workflow.id,
            name: workflow.name,
            status: state?.status,
          },
        );

        return {
          status: EXECUTION_STATUS.EXECUTION_NOT_SUSPENDED,
          reason: `The actual status for the workflow execution found with id ${executionId} it not suspended.`,
        };
      }
    }

    logger?.info(
      "[tool][resume-workflow-tool] failed to resume, workflow not found",
      {
        executionId,
        workflowName,
      },
    );

    return {
      status: EXECUTION_STATUS.EXECUTION_NOT_FOUND,
      reason: `No workflow found for name: ${workflowName}.`,
    };
  },
});

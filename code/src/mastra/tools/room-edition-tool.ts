// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { createTool } from "@mastra/core/tools";
import { SourceDocumentUIPart } from "ai";
import { z } from "zod";

export const roomEditionTool = createTool({
  id: "room-edition-tool",
  description: "Edit the room based on a description",
  inputSchema: z.object({
    prompt: z.string().describe("What the user wants to edit in the room"),
  }),
  outputSchema: z.object({
    status: z.string().describe("The status of the room edition"),
    result: z.string().describe("The result of the room edition"),
  }),
  execute: async (params, context) => {
    const logger = context?.mastra?.getLogger();

    logger?.info("[tool][room-edition-tool] called", params);

    const mastra = context.mastra;
    const requestContext = context.requestContext;

    if (!mastra) {
      throw new Error("Mastra instance is required in the context");
    }

    const roomId = requestContext?.get("roomId") as string;
    const pageId = requestContext?.get("pageId") as string;
    const referenceNodes: SourceDocumentUIPart[] =
      requestContext?.get("referenceNodes") ?? [];
    const referenceImages = requestContext?.get("referenceImages") ?? [];

    logger?.info("[tool][room-edition-tool] request context", {
      roomId,
    });

    const roomEditionWorkflow = mastra.getWorkflowById("room-edition-workflow");

    if (!roomEditionWorkflow) {
      throw new Error("Room edition workflow not found");
    }

    logger?.info(
      "[tool][image-generation-or-edition-tool] executing workflow",
      {
        id: roomEditionWorkflow.id,
        name: roomEditionWorkflow.name,
      },
    );

    try {
      const run = await roomEditionWorkflow.createRun();

      const stream = await run.stream({
        inputData: {
          message: params.prompt,
          referenceNodes: referenceNodes.map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (node: any) => ({
              nodeId: node.sourceId,
              nodeType: node.mediaType,
            }),
          ),
        },
        initialState: {
          originalMessage: params.prompt,
          roomId,
          pageId,
          referenceImages,
          imagesInformation: [],
          referenceNodesInformation: [],
        },
      });

      await stream!.fullStream.pipeTo(context.writer!);

      const result = await stream!.result;

      if (result.status === "suspended") {
        const suspendStep = result.suspended[0];
        const suspendedPayload = result.steps[suspendStep[0]].suspendPayload;

        logger?.info("[tool][room-edition-tool] suspended", {
          suspendedPayload,
        });
      }

      logger?.info("[tool][room-edition-tool] result status", {
        status: result.status,
      });

      switch (result.status) {
        case "success": {
          return {
            status: result.status,
            result: `Room edition planed.`,
          };
        }
        case "suspended": {
          return {
            status: result.status,
            result: `Human input needed to define the plan.`,
          };
        }
        case "failed": {
          return {
            status: result.status,
            result: `Room edition failed.`,
          };
        }
        default:
          break;
      }
    } catch (error) {
      logger?.error("[tool][room-edition-tool] error executing workflow", {
        error: error instanceof Error ? error.message : error,
      });
      return {
        status: "failed",
        result: `Room edition workflow failed with error: ${error}`,
      };
    }
  },
});

// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { RequestContext } from "@mastra/core/request-context";
import { WeaveRuntimeContext } from "../types.js";

export const imageGenerationOrEditionTool = createTool({
  id: "image-generation-or-edit-tool",
  description: "Generate or edit an image based on a description",
  inputSchema: z.object({
    prompt: z.string().describe("What the user wants to see in the image"),
  }),
  outputSchema: z.object({
    status: z
      .string()
      .describe("The status of the image generation or edition"),
    result: z
      .string()
      .describe("The result of the image generation or edition"),
  }),
  execute: async (params, context) => {
    const logger = context?.mastra?.getLogger();

    logger?.info("[tool][image-generation-or-edition-tool] called", params);

    const mastra = context.mastra;
    const requestContext =
      context.requestContext as RequestContext<WeaveRuntimeContext>;

    const roomId = requestContext.get("roomId");
    const threadId = requestContext.get("threadId");
    const resourceId = requestContext.get("resourceId");
    const imageOption = requestContext.get("imageOption");
    const referenceImages = requestContext.get("referenceImages");

    logger?.info("[tool][image-generation-or-edition-tool] request context", {
      roomId,
      threadId,
      resourceId,
      imageOption,
      referenceImages,
    });

    if (!mastra) {
      throw new Error("Mastra instance is required in the context");
    }

    const imageGenerationOrEditionWorkflow = mastra.getWorkflowById(
      "image-generation-or-edit-workflow",
    );

    if (!imageGenerationOrEditionWorkflow) {
      throw new Error("Image generation or edition workflow not found");
    }

    logger?.info(
      "[tool][image-generation-or-edition-tool] executing workflow",
      {
        id: imageGenerationOrEditionWorkflow.id,
        name: imageGenerationOrEditionWorkflow.name,
      },
    );

    try {
      const run = await imageGenerationOrEditionWorkflow.createRun();

      const stream = await run.stream({
        inputData: {
          message: params.prompt,
        },
        initialState: {
          originalMessage: params.prompt,
          roomId,
          threadId,
          resourceId,
          imageOption,
          referenceImages,
        },
      });

      await stream!.fullStream.pipeTo(context.writer!);

      const result = await stream!.result;

      if (result.status === "suspended") {
        const suspendStep = result.suspended[0];
        const suspendedPayload = result.steps[suspendStep[0]].suspendPayload;

        logger?.info("[tool][image-generation-or-edition-tool] suspended", {
          suspendedPayload,
        });
      }

      logger?.info("[tool][image-generation-or-edition-tool] result status", {
        status: result.status,
      });

      switch (result.status) {
        case "success": {
          return {
            status: result.status,
            result: `Image generation or edition planed.`,
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
            result: `Image generation or edition failed.`,
          };
        }
        default:
          break;
      }
    } catch (error) {
      logger?.error(
        "[tool][image-generation-or-edition-tool] error executing workflow",
        {
          error: error instanceof Error ? error.message : error,
        },
      );
      return {
        status: "failed",
        result: `Image generation or edition failed with error: ${error}`,
      };
    }
  },
});

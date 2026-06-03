// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { v4 as uuidv4 } from "uuid";
import { createStep } from "@mastra/core/workflows";
import { z } from "zod";
import { ImageOptions } from "../types.js";
import { generateImages } from "../api/image-generation.js";
import { imageOptionSchema, imageReferenceSchema } from "../schemas.js";

export const IMAGE_GENERATION_OR_EDITION_STATUS = {
  SUCCESS: "success",
  FAILURE: "failure",
} as const;

export const createExecutionStep = async () => {
  return createStep({
    id: "image-generation-or-edition-execution",
    inputSchema: z.object({ prompt: z.string(), plan: z.string() }),
    outputSchema: z.object({
      result: z.string(),
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
    stateSchema: z.object({
      originalMessage: z.string(),
      roomId: z.string(),
      threadId: z.string(),
      resourceId: z.string(),
      imageOption: imageOptionSchema,
      referenceImages: z.array(imageReferenceSchema),
    }),
    execute: async ({ inputData, mastra, writer, state }) => {
      const { prompt, plan } = inputData;
      const { roomId, threadId, resourceId, imageOption, referenceImages } =
        state;

      const logger = mastra?.getLogger();

      logger?.info(
        `[workflow][image-generation-or-edit-workflow.execution] called`,
        {
          prompt,
        },
      );

      logger?.info(
        `[workflow][image-generation-or-edit-workflow.execution] state`,
        {
          roomId,
          threadId,
          resourceId,
          imageOption,
          referenceImages,
        },
      );

      const tasks = Array.from({ length: imageOption.samples }).map(
        (_, index) => ({
          id: "generate_image_" + (index + 1),
          name: "Generate image " + (index + 1),
          status: "running",
        }),
      );

      const tasksMessageId = uuidv4();
      await writer?.custom({
        id: tasksMessageId,
        type: "data-workflow-step-event",
        data: {
          workflowId: "image-generation-or-edit-workflow",
          stepId: "image-generation-or-edition-execution",
          title: "Execution tasks",
          tasks: tasks,
          transient: true,
        },
      });

      const imageParams: ImageOptions = imageOption ?? {
        model: "openai/gpt-image-1",
        samples: 1,
        aspectRatio: "16:9",
        quality: "medium",
        size: "1K",
      };

      logger?.info(
        `[workflow][image-generation-or-edit-workflow.execution] generateImages params`,
        {
          prompt,
          params: {
            roomId,
            threadId,
            resourceId,
            referenceImages,
            imageOption: imageParams,
          },
        },
      );

      try {
        const images = await generateImages(
          prompt,
          {
            roomId,
            threadId,
            resourceId,
            referenceImages,
            imageOption: imageParams,
          },
          async ({ status, data }) => {
            const { index } = data;

            tasks[index].status = status;

            await writer?.custom({
              id: tasksMessageId,
              type: "data-workflow-step-event",
              data: {
                workflowId: "image-generation-or-edit-workflow",
                stepId: "image-generation-or-edition-execution",
                title: "Execution tasks",
                tasks: tasks,
                transient: true,
              },
            });
          },
        );

        logger?.info(
          `[workflow][image-generation-or-edit-workflow.execution] generated [${images.length}] images`,
          {
            images,
          },
        );

        return {
          result: `Image generation completed successfully.
          Images generated: ${images.length}.`,
          status: IMAGE_GENERATION_OR_EDITION_STATUS.SUCCESS,
          images,
          plan,
        };
      } catch (error) {
        logger?.error(
          `[workflow][image-generation-or-edit-workflow.execution] error generating images`,
          {
            error: (error as Error).message,
          },
        );
        return {
          result: `An error occurred while generating the images.`,
          status: IMAGE_GENERATION_OR_EDITION_STATUS.FAILURE,
          images: [],
          plan,
        };
      }
    },
  });
};

// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Agent } from "@mastra/core/agent";
import { getMemory } from "../connectors.js";
import { imageGenerationOrEditionTool } from "../tools/image-generation-or-edition-tool.js";
import { ReferenceImage } from "../types.js";
import { ANALYSIS_MODEL } from "../index.js";

export type ImageSizeGemini = "1K" | "2K" | "4K";

export type ImageSizeChatGTP = "1024x1024" | "1024x1536" | "1536x1024";

export type ImageAspectRatioGemini =
  | "1:1"
  | "2:3"
  | "3:2"
  | "3:4"
  | "4:3"
  | "9:16"
  | "16:9"
  | "21:9";

export type ImageAspectRatioChatGTP = "1:1" | "1:5" | "5:1";

export type ImageQualityChatGTP = "low" | "medium" | "high";

export type AvailableImageModels =
  | "openai/gpt-image-1"
  | "gemini-3.1-flash-image-preview";

export type ImageOptions =
  | {
      model: "openai/gpt-image-1";
      samples: number;
      aspectRatio: ImageAspectRatioChatGTP;
      quality: ImageQualityChatGTP;
      size: ImageSizeChatGTP;
    }
  | {
      model: "gemini-3.1-flash-image-preview";
      samples: number;
      aspectRatio: ImageAspectRatioGemini;
      quality?: undefined;
      size: ImageSizeGemini;
    };

export type ImageGeneratorRuntimeContext = {
  roomId: string;
  threadId: string;
  resourceId: string;
  referenceImages: ReferenceImage[];
  imageOption: ImageOptions;
};

export const getImageGenerationOrEditionExecutorAgent = async () => {
  const memory = await getMemory();

  return new Agent({
    id: "image-generation-or-edition-executor-agent",
    name: "Image Generation or Edition Executor Agent",
    instructions: `
      You are specialized agent, your main responsibility is to help users generate images or edit images based
      on their requests, the users can also provided reference images to support their requests.
      
      You have access to the "Image Generation or Edition Tool", which you can use to:
      
      - Generate new images based only on the user prompt.
      - Edit existing images based only the user prompt.
      - Edit existing images based on the user prompt and some reference images.

      Steps to perform when receiving a user request:

      - Understand the user request and the provided context, including the reference images and image options.
      - Call the image generation tool with the right parameters, including the user prompt, the reference
        images (if needed), and the image options.
      - Based on the tool result, provide feedback to the user about the generated or edited images, including
        a brief resume of what you did and what options you used.

      NEVER showcase any images to the user.
    `,
    model: ANALYSIS_MODEL,
    tools: {
      imageGenerationOrEditionTool,
    },
    memory,
  });
};

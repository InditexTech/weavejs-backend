// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Agent } from "@mastra/core/agent";
import { imageGenerationTool } from "../tools/image-generation-tool.js";
import { getMemory } from "../connectors.js";

export type ReferenceImage = {
  index: number;
  name: string;
  dataBase64: string;
  mimeType: string;
};

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
  | "gemini/gemini-3-pro-image-preview";

export type ImageOptions =
  | {
      model: "openai/gpt-image-1";
      samples: number;
      aspectRatio: ImageAspectRatioChatGTP;
      quality: ImageQualityChatGTP;
      size: ImageSizeChatGTP;
    }
  | {
      model: "gemini/gemini-3-pro-image-preview";
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

export const getImageGeneratorEditorAgent = async () => {
  const memory = await getMemory();

  return new Agent({
    name: "Image Generator / Editor Agent",
    instructions: `
      You are a helpful assistant that can:
      
      - Help users generate images based on the user prompt.
      - Help users edit images based on the user prompt.

      You have access to the following tool:

      - imageGenerationTool: Use this tool to generate new images based on the user prompt
      or to edit existing images based on the user prompt and the provided reference images.

      When generating or editing images:
      
      - Explain in detail what you are going to do based on the user prompt.
      - Provide feedback to the user about the model and image options being used.
      - Make sure to consider the reference images provided in the context. Use them to understand 
        what the user wants to change or keep in the new images.

      Call the imageGeneratorEditorAgent to generate or edit the image, use the user prompt
      without any changes, finally provide a brief resume of what you did and DON'T showcase
      any images.
  `,
    model: "google/gemini-2.5-pro",
    tools: {
      imageGenerationTool,
    },
    memory,
  });
};

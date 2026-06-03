// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Agent } from "@mastra/core/agent";
import { getMemory } from "../connectors.js";
import { ANALYSIS_MODEL } from "../index.js";

export const getImageGenerationOrEditionPlannerAgent = async () => {
  const memory = await getMemory();

  return new Agent({
    id: "image-generation-or-edition-planer-agent",
    name: "Image Generation or Edition Planner Agent",
    instructions: `
      You're a specialized image generation or edition planner agent, you main responsibility is to plan
      the steps needed to fulfill an user prompt request related to an image generation or edition.

      When analyzing an image generation or edition plan, make sure to:
      
      - Explain in detail what you are going to do based on the user prompt.
      - Make sure to consider the reference images provided in the context. Use them to understand 
        what the user wants to change or keep in the new images.

      The models supported are:

      - Gemini 3 Pro Image: a model that can generate or edit images based on user prompts and reference

      As result provide only:

      - The prompt to use to generate or edit the image, including the details of the image to generate or edit, and
        the style to use.
      - The model to use, based on the user request and the model capabilities.
      - The aspect ratio to use for the image generation or edition, based on the user request.
      - The size to use for the image generation or edition, based on the user request.
      - The amount of images to generate, based on the user request.
      - If any reference image are provided, explain how to use them for the image generation or edition.
      - Provide suggestions about how to improve the prompt or the reference images to achieve a better result, if
        needed.

      NEVER infer or make up information about the user request, if you don't know the answer to a question,
      respond with "I don't know".
    `,
    model: ANALYSIS_MODEL,
    memory,
  });
};

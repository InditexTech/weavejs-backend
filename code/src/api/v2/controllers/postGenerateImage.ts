// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { z } from "zod";
import { Request, Response } from "express";
import { getServiceConfig } from "../../../config/config.js";
import { verifyAIPassword } from "../../../lib/aiPassword.js";

const payloadSchema = z.object({
  prompt: z.string().max(4000),
  sample_count: z.number().int().min(1).max(10),
  size: z.enum(["1024x1024", "1536x1024", "1024x1536"]),
  quality: z.enum(["low", "medium", "high"]).optional(),
  moderation: z.string().max(50).optional(),
});

export const postGenerateImageController = () => {
  const config = getServiceConfig();

  return async (req: Request, res: Response): Promise<void> => {
    const password = req.headers["x-ai-password"];

    if (!verifyAIPassword(password, config.ai.password)) {
      res.status(401).json({ status: "KO", message: "Not enabled" });
      return;
    }

    const parsedBody = payloadSchema.safeParse(req.body);
    if (!parsedBody.success) {
      res.status(400).json({ errors: parsedBody.error.issues });
      return;
    }

    const { prompt, sample_count, size, quality, moderation } = parsedBody.data;

    const requestBody = {
      model: "gpt-image-1",
      prompt,
      n: sample_count,
      size,
      quality,
      moderation,
      output_format: "png",
    };

    try {
      req.setTimeout(config.azureCsClient.timeoutSecs * 1000);

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        config.azureCsClient.timeoutSecs * 1000
      );

      const response = await fetch(
        `${config.azureCsClient.endpoint}/openai/deployments/gpt-image-1/images/generations?api-version=2025-04-01-preview`,
        {
          method: "POST",
          headers: {
            "Api-Key": config.azureCsClient.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        }
      );

      const jsonData = await response.json();
      clearTimeout(timeout);

      res.status(response.status).json(jsonData);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (ex: any) {
      if (ex.name === "AbortError") {
        console.error("Request timed out.");
      } else if (ex instanceof SyntaxError) {
        console.error("Failed to parse response JSON:", ex.message);
      } else if (ex instanceof Error) {
        console.error(`Fetch error: ${ex.message}`);
      } else {
        console.error("Unknown error:", ex);
      }

      res.status(500).json({ error: ex, message: "Error generating image" });
    }
  };
};

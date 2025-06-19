// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getServiceConfig } from "../../../config/config.js";
import { getGcpClient } from "../../../clients/gcp.js";

export const postEditImageController = () => {
  const config = getServiceConfig();

  return async (req: Request, res: Response): Promise<void> => {
    const { model, prompt, image, style, styleStrength } = req.body;
    const password = req.query.password;

    if (password !== config.ai.password) {
      res.status(401).json({ status: "KO", message: "Not enabled" });
    }

    let aspectRatio = "1:1";
    if (req.body.aspectRatio) {
      aspectRatio = req.body.aspectRatio;
    }

    let personGeneration = "allow_adult";
    if (req.body.personGeneration) {
      personGeneration = req.body.personGeneration;
    }

    let outputOptions = { mimeType: "image/png", compressionQuality: 75 };
    if (req.body.outputOptions) {
      outputOptions = req.body.outputOptions;
    }

    const requestBody = {
      instances: [
        {
          prompt,
          image: {
            bytesBase64Encoded: image,
          },
        },
      ],
      parameters: {
        sampleCount: 1,
        aspectRatio,
        includeSafetyAttributes: true,
        personGeneration,
        outputOptions,
        imageGenerationStyle: style,
        styleStrength,
      },
    };

    console.log("requestBody", requestBody);

    try {
      req.setTimeout(config.gcpClient.timeoutSecs * 1000);

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        config.gcpClient.timeoutSecs * 1000
      );

      const client = getGcpClient();
      const response = await client.fetch(
        // `${config.llmService.endpoint}/v1/images/generations`,
        `${config.gcpClient.endpoint}/v1/projects/itx-moyaint-pre/locations/us-central1/publishers/google/models/${model}:predict`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);
      res.status(response.status).json(response.data);
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

      res.status(500).json({ error: ex, message: "Error editing image" });
    }
  };
};

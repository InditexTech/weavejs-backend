// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getServiceConfig } from "../../../config/config.js";
import { getGcpClient } from "../../../clients/gcp.js";

export const postGenerateImageController = () => {
  const config = getServiceConfig();

  return async (req: Request, res: Response): Promise<void> => {
    const { prompt, reference_images, negative_prompt, sample_count } =
      req.body;
    const password = req.query.password;

    if (password !== config.ai.password) {
      res.status(401).json({ status: "KO", message: "Not enabled" });
      return;
    }

    let aspectRatio = "1:1";
    if (req.body.aspectRatio) {
      aspectRatio = req.body.aspectRatio;
    }

    const requestBody = {
      instances: [
        {
          prompt,
          ...(reference_images && {
            referenceImages: reference_images.map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (referenceImage: any, index: number) => ({
                referenceType: "REFERENCE_TYPE_SUBJECT",
                referenceId: index + 1,
                referenceImage: {
                  bytesBase64Encoded: referenceImage.base64Image,
                },
                subjectImageConfig: {
                  subjectDescription: referenceImage.description,
                  subjectType: "SUBJECT_TYPE_DEFAULT",
                },
              })
            ),
          }),
        },
      ],
      parameters: {
        sampleCount: sample_count,
        ...(negative_prompt &&
          negative_prompt !== "" && { negativePrompt: negative_prompt }),
        aspectRatio,
        includeSafetyAttributes: true,
      },
    };

    try {
      req.setTimeout(config.gcpClient.timeoutSecs * 1000);

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        config.gcpClient.timeoutSecs * 1000
      );

      const client = getGcpClient();
      const response = await client.fetch(
        `${config.gcpClient.vertexEndpoint}/v1/projects/itx-moyaint-pre/locations/us-central1/publishers/google/models/imagen-4.0-generate-preview-06-06:predict`,
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

      res.status(500).json({ error: ex, message: "Error generating image" });
    }
  };
};

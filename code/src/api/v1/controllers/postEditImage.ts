// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getServiceConfig } from "../../../config/config.js";
import { getGcpClient } from "../../../clients/gcp.js";

export const postEditImageController = () => {
  const config = getServiceConfig();

  return async (req: Request, res: Response): Promise<void> => {
    const {
      sample_count,
      prompt,
      negative_prompt,
      image,
      imageMask,
      seed,
      edit_mode,
      base_steps,
      guidance_strength,
    } = req.body;
    const password = req.query.password;

    if (password !== config.ai.password) {
      res.status(401).json({ status: "KO", message: "Not enabled" });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const requestBody: any = {
      instances: [
        {
          prompt,
          referenceImages: [
            {
              referenceType: "REFERENCE_TYPE_RAW",
              referenceId: 1,
              referenceImage: {
                bytesBase64Encoded: image,
              },
            },
          ],
        },
      ],
      parameters: {
        sampleCount: sample_count,
        ...(negative_prompt &&
          negative_prompt !== "" && { negativePrompt: negative_prompt }),
        seed,
        ...(imageMask && {
          editConfig: {
            baseSteps: base_steps,
          },
          editMode: edit_mode,
        }),
        ...(!imageMask && {
          guidanceScale: guidance_strength,
        }),
      },
    };

    if (imageMask) {
      requestBody.instances[0].referenceImages.push({
        referenceType: "REFERENCE_TYPE_MASK",
        referenceId: 2,
        referenceImage: {
          bytesBase64Encoded: imageMask,
        },
        maskImageConfig: {
          maskMode: "MASK_MODE_USER_PROVIDED",
          dilation: 0.01,
        },
      });
    }

    try {
      req.setTimeout(config.gcpClient.timeoutSecs * 1000);

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        config.gcpClient.timeoutSecs * 1000
      );

      const client = getGcpClient();

      const response = await client.fetch(
        // `${config.gcpClient.fluxEndpoint}/v1/projects/655051647031/locations/us-central1/endpoints/1463930463151194112:predict`,
        `${config.gcpClient.vertexEndpoint}/v1/projects/itx-moyaint-pre/locations/us-central1/publishers/google/models/imagen-3.0-capability-001:predict`,
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

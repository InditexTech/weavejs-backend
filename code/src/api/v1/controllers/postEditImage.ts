// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getServiceConfig } from "../../../config/config.js";
import { getGcpClient } from "../../../clients/gcp.js";

export const postEditImageController = () => {
  const config = getServiceConfig();

  return async (req: Request, res: Response): Promise<void> => {
    const { prompt, negative_prompt, image, guidance_scale, strength } =
      req.body;
    const password = req.query.password;

    if (password !== config.ai.password) {
      res.status(401).json({ status: "KO", message: "Not enabled" });
      return;
    }

    const requestBody = {
      instances: [
        {
          prompt,
          negative_prompt,
          image: {
            bytesBase64Encoded: image,
          },
        },
      ],
      parameters: {
        // sampleCount: 1,
        // num_inference_steps: 4,
        seed: 42,
        guidance_scale,
        strength,
      },
    };

    // console.log("requestBody", requestBody);

    try {
      req.setTimeout(config.gcpClient.timeoutSecs * 1000);

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        config.gcpClient.timeoutSecs * 1000
      );

      const client = getGcpClient();

      console.log("sent", requestBody);

      const response = await client.fetch(
        `${config.gcpClient.fluxEndpoint}/v1/projects/655051647031/locations/us-central1/endpoints/1463930463151194112:predict`,
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

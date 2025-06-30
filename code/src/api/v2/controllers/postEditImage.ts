// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { Request, Response } from "express";
import { getServiceConfig } from "../../../config/config.js";
import { getGcpClient } from "../../../clients/gcp.js";

function base64ToBlob(dataURL: string): Blob {
  const [metadata, base64] = dataURL.split(",");
  const mimeMatch = metadata.match(/:(.*?);/);

  if (!mimeMatch) {
    throw new Error("Invalid data URL");
  }

  const mime = mimeMatch[1];

  const MAX_BASE64_LENGTH = 10 * 1024 * 1024; // Define a reasonable maximum length (10 MB)
  if (base64.length > MAX_BASE64_LENGTH) {
    throw new Error(`Base64 string exceeds maximum allowed length of ${MAX_BASE64_LENGTH} characters`);
  }

  const binary = atob(base64);
  const len = binary.length;
  const arrayBuffer = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    arrayBuffer[i] = binary.charCodeAt(i);
  }

  return new Blob([arrayBuffer], { type: mime });
}

export const postEditImageController = () => {
  const config = getServiceConfig();

  return async (req: Request, res: Response): Promise<void> => {
    const {
      sample_count,
      prompt,
      image,
      reference_images,
      imageMask,
      size,
      quality,
      moderation,
    } = req.body;
    const password = req.query.password;

    if (password !== config.ai.password) {
      res.status(401).json({ status: "KO", message: "Not enabled" });
      return;
    }

    const formData = new FormData();

    try {
      const blob = base64ToBlob(image);
      const file = new File([blob], "image.png", { type: blob.type });
      formData.append(
        reference_images && reference_images.length > 0 ? "image[]" : "image",
        file
      );

      if (Array.isArray(reference_images) && reference_images.length > 0) {
        const maxLength = 100; // Define a reasonable maximum length
        if (reference_images.length > maxLength) {
          throw new Error(`reference_images exceeds maximum allowed length of ${maxLength}`);
        }
        for (let i = 0; i < reference_images.length; i++) {
          const referenceImage = reference_images[i];
          const referenceBlob = base64ToBlob(referenceImage);
          const referenceFile = new File(
            [referenceBlob],
            `reference_${i + 1}.png`,
            {
              type: referenceBlob.type,
            }
          );
          formData.append("image[]", referenceFile);
        }
      }

      if (imageMask) {
        const maskBlob = base64ToBlob(imageMask);
        const file = new File([maskBlob], "mask.png", { type: blob.type });
        formData.append("mask", file);
      }

      formData.append("model", "gpt-image-1");
      formData.append("prompt", prompt);
      formData.append("size", size);
      formData.append("n", sample_count);
      formData.append("quality", quality);
      formData.append("moderation", moderation);
      formData.append("output_format", "png");
    } catch (ex) {
      res
        .status(400)
        .json({ error: (ex as Error).message, message: "Error editing image" });
      return;
    }

    try {
      req.setTimeout(config.azureCsClient.timeoutSecs * 1000);

      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        config.azureCsClient.timeoutSecs * 1000
      );

      const client = getGcpClient();

      const response = await client.fetch(
        `${config.azureCsClient.endpoint}/openai/deployments/gpt-image-1/images/edits?api-version=2025-04-01-preview`,
        {
          method: "POST",
          headers: {
            "Api-Key": config.azureCsClient.apiKey,
          },
          body: formData,
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

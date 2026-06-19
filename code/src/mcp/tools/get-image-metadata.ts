// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import sharp from "sharp";
import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { assertSafeUrl } from "@/utils.js";

export const registerTool = (server: McpServer) => {
  server.registerTool(
    "get-image-metadata",
    {
      title: "Get metadata of an image",
      description:
        "Provides the metadata of an image (width, height) when an URL is provided. The URL needs to be accessible for the server. Also can be a Data URL with the image encoded in base64.",
      inputSchema: z.object({
        imageSource: z.string(),
      }),
      outputSchema: z.union([
        z.object({
          width: z.number().describe("The width of the image in pixels."),
          height: z.number().describe("The height of the image in pixels."),
          mimeType: z
            .string()
            .describe("The mime type of the image, e.g. 'image/png'."),
        }),
        z.object({
          error: z.string(),
        }),
      ]),
      annotations: {
        readOnlyHint: true,
        idempotentHint: true,
        destructiveHint: false,
        openWorldHint: true,
      },
    },
    async ({ imageSource }) => {
      try {
        const metadata = await getImageMetadata(imageSource);

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(metadata),
            },
          ],
          structuredContent: metadata,
        };
      } catch (ex) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error: Cannot retrieve image metadata. ${ex instanceof Error ? ex.message : ""}`,
            },
          ],
          structuredContent: {
            error: `Cannot retrieve image metadata. ${ex instanceof Error ? ex.message : ""}`,
          },
        };
      }
    },
  );
};

export async function getImageMetadata(input: string) {
  let image: sharp.Sharp;

  //
  // DATA URL
  //
  if (input.startsWith("data:")) {
    const base64 = input.split(",")[1];
    const buffer = Buffer.from(base64, "base64");

    image = sharp(buffer);
  }
  //
  // REMOTE URL
  //
  else {
    const MAX_IMAGE_BYTES = 10 * 1024 * 1024; // 10 MB

    assertSafeUrl(input);
    const response = await fetch(input, { redirect: "error" });

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const contentLength = response.headers.get("content-length");
    if (contentLength !== null && Number(contentLength) > MAX_IMAGE_BYTES) {
      throw new Error(
        `Image response too large: ${contentLength} bytes (max ${MAX_IMAGE_BYTES})`,
      );
    }

    if (!response.body) {
      throw new Error("Image response has no body");
    }

    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    const reader = response.body.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.length;
      if (totalBytes > MAX_IMAGE_BYTES) {
        await reader.cancel();
        throw new Error(
          `Image response exceeds size limit of ${MAX_IMAGE_BYTES} bytes`,
        );
      }
      chunks.push(value);
    }

    image = sharp(Buffer.concat(chunks));
  }

  const metadata = await image.metadata();

  const mimeTypes: Record<string, string> = {
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    avif: "image/avif",
    tiff: "image/tiff",
    svg: "image/svg+xml",
  };

  return {
    width: metadata.width,
    height: metadata.height,
    mimeType: mimeTypes[metadata.format],
  };
}

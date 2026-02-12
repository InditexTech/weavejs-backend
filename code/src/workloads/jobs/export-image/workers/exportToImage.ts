// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { parentPort } from "worker_threads";
import sharp from "sharp";
import Konva from "konva";
import { WEAVE_EXPORT_FORMATS } from "@inditextech/weave-types";
import { renderWeaveRoom } from "../../../../canvas/weave.js";

parentPort?.on(
  "message",
  async ({ jobId, config, roomData, nodes, options }) => {
    const logMessage = (message: string) => {
      console.log(`[${jobId}] ${message}`);
    };

    const { instance, destroy } = await renderWeaveRoom(config, roomData);

    logMessage("generating image");

    const { composites, width, height } = await instance.exportNodesServerSide(
      nodes,
      (nodes: Konva.Node[]) => nodes,
      {
        format: options.format,
        padding: options.padding,
        pixelRatio: options.pixelRatio,
        backgroundColor: options.backgroundColor,
        quality: options.quality,
      },
    );

    logMessage("image generated");

    destroy();

    try {
      logMessage("composing image");

      const composedImage = sharp({
        create: {
          width,
          height,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      }).composite(composites);

      logMessage("image composed");

      let imagePipeline = composedImage;
      if (options.format === WEAVE_EXPORT_FORMATS.JPEG) {
        imagePipeline = composedImage.jpeg({
          quality: (options.quality ?? 0.8) * 100,
        });
      }
      if (options.format === WEAVE_EXPORT_FORMATS.PNG) {
        imagePipeline = composedImage.png();
      }

      logMessage("getting image buffer");

      const imageBuffer = await imagePipeline.toBuffer();

      logMessage("image buffer obtained");

      const buffer = imageBuffer.buffer.slice(
        imageBuffer.byteOffset,
        imageBuffer.byteOffset + imageBuffer.byteLength,
      );

      logMessage("sending image buffer to parent");

      parentPort?.postMessage(buffer, [buffer as ArrayBuffer]);

      logMessage("image buffer sent to parent");
    } catch (error) {
      console.error(`[${jobId}] error generating image: `, error);

      const buffer = Buffer.from(
        JSON.stringify({
          error: {
            name: (error as Error).name,
            message: (error as Error).message,
          },
        }),
        "utf8",
      );
      const ab = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      );

      logMessage("sending error buffer to parent");

      parentPort?.postMessage(ab, [ab as ArrayBuffer]);

      logMessage("error buffer sent to parent");
    }
  },
);

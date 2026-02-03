// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { parentPort } from "worker_threads";
import sharp from "sharp";
import { WEAVE_EXPORT_FORMATS } from "@inditextech/weave-types";
import { renderWeaveRoom } from "../../../../canvas/weave.js";

parentPort?.on("message", async ({ config, roomData, nodes, options }) => {
  const { instance, destroy } = await renderWeaveRoom(config, roomData);

  const { composites, width, height } = await instance.exportNodesServerSide(
    nodes,
    (nodes) => nodes,
    {
      format: options.format,
      padding: options.padding,
      pixelRatio: options.pixelRatio,
      backgroundColor: options.backgroundColor,
      quality: options.quality,
    }
  );

  destroy();

  try {
    const composedImage = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).composite(composites);

    let imagePipeline = composedImage;
    if (options.format === WEAVE_EXPORT_FORMATS.JPEG) {
      imagePipeline = composedImage.jpeg({
        quality: (options.quality ?? 0.8) * 100,
      });
    }
    if (options.format === WEAVE_EXPORT_FORMATS.PNG) {
      imagePipeline = composedImage.png();
    }

    const imageBuffer = await imagePipeline.toBuffer();

    const buffer = imageBuffer.buffer.slice(
      imageBuffer.byteOffset,
      imageBuffer.byteOffset + imageBuffer.byteLength
    );

    parentPort?.postMessage(buffer, [buffer as ArrayBuffer]);
  } catch (error) {
    const buffer = Buffer.from(
      JSON.stringify({
        error: {
          name: (error as Error).name,
          message: (error as Error).message,
        },
      }),
      "utf8"
    );
    const ab = buffer.buffer.slice(
      buffer.byteOffset,
      buffer.byteOffset + buffer.byteLength
    );
    parentPort?.postMessage(ab, [ab as ArrayBuffer]);
  }
});

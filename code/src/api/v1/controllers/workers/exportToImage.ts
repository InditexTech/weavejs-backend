// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { parentPort } from "worker_threads";
import sharp from "sharp";
import { renderWeaveRoom } from "../../../../canvas/weave.js";
import { WeaveExportFormats } from "@inditextech/weave-types";

parentPort?.on("message", async ({ config, roomData, nodes, options }) => {
  const { instance, destroy } = await renderWeaveRoom(config, roomData);

  const { composites, width, height } = await instance.exportNodesAsBuffer(
    nodes,
    (nodes) => nodes,
    {
      format: options.format as WeaveExportFormats,
      padding: options.padding,
      pixelRatio: options.pixelRatio,
      backgroundColor: options.backgroundColor,
      quality: options.quality, // Only used for image/jpeg
    }
  );

  destroy();

  try {
    const finalImage = sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).composite(composites);

    const finalBuffer = await finalImage.png().toBuffer();
    parentPort?.postMessage(finalBuffer, [finalBuffer.buffer as ArrayBuffer]);
  } catch (error) {
    parentPort?.postMessage((error as Error).message);
  }
});

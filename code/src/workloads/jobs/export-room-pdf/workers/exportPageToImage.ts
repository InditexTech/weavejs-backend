// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { parentPort } from "worker_threads";
import sharp from "sharp";
import Konva from "konva";
import { renderWeaveRoom } from "../../../../canvas/weave.js";
import { ImagesPersistenceHandler } from "@/images/persistence.js";
import { ExportToImagePageWorkerPayload } from "./types.js";

parentPort?.on("message", async (params: ExportToImagePageWorkerPayload) => {
  const { jobId, roomId, imageId, config, roomData, options, type } = params;

  const logMessage = (message: string) => {
    console.log(`[${jobId}] export page to image / ${message}`);
  };

  try {
    logMessage(`rendering room [${type}]`);

    const { instance, destroy } = await renderWeaveRoom(config, roomData);

    logMessage(`generating image`);

    let exportFunction = undefined;

    if (type === "nodes") {
      exportFunction = async () => {
        return await instance.exportNodesServerSide(
          params.nodes,
          (nodes: Konva.Node[]) => nodes,
          {
            format: "image/png",
            padding: options.padding,
            pixelRatio: options.pixelRatio,
            backgroundColor: "#FFFFFF",
          },
        );
      };
    }

    if (type === "area") {
      exportFunction = async () => {
        return await instance.exportAreaServerSide(params.area, {
          format: "image/png",
          padding: options.padding,
          pixelRatio: options.pixelRatio,
          backgroundColor: "#FFFFFF",
        });
      };
    }

    if (!exportFunction) {
      parentPort?.postMessage({
        status: "KO",
        error: "Invalid export type",
      });
      return;
    }

    const { composites, width, height } = await exportFunction();

    logMessage("image generated");

    destroy();

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

    const imagePipeline = composedImage.png();

    logMessage("getting image buffer");

    const imageBuffer = await imagePipeline.toBuffer();

    logMessage("image buffer obtained");

    logMessage("persisting image");

    const imagesPersistenceHandler = new ImagesPersistenceHandler(
      config,
      "exported-images",
      true,
    );

    const fileName = `${roomId}/${imageId}`;
    await imagesPersistenceHandler.persist(
      fileName,
      { size: imageBuffer.byteLength, mimeType: "image/png" },
      imageBuffer,
    );

    logMessage("image persisted");

    parentPort?.postMessage({ status: "OK", fileName });
  } catch (error) {
    console.error(`[${jobId}] error generating image: `, error);

    parentPort?.postMessage({
      status: "KO",
      error: (error as Error).message,
    });
  }
});

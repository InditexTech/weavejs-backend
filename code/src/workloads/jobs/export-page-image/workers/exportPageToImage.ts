// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { parentPort } from "worker_threads";
import sharp from "sharp";
import Konva from "konva";
import { WEAVE_EXPORT_FORMATS } from "@inditextech/weave-types";
import { renderWeaveRoom } from "../../../../canvas/weave.js";
import { ImagesPersistenceHandler } from "@/images/persistence.js";
import { ExportPageImageWorkerPayload } from "./types.js";

parentPort?.on("message", async (params: ExportPageImageWorkerPayload) => {
  const { jobId, roomId, imageId, config, roomData, options, type } = params;

  const logMessage = (message: string) => {
    console.log(`[${jobId}] export to image / ${message}`);
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
            format: options.format,
            padding: options.padding,
            pixelRatio: options.pixelRatio,
            backgroundColor: options.backgroundColor,
            quality: options.quality,
          },
        );
      };
    }

    if (type === "area") {
      exportFunction = async () => {
        return await instance.exportAreaServerSide(params.area, {
          format: options.format,
          padding: options.padding,
          pixelRatio: options.pixelRatio,
          backgroundColor: options.backgroundColor,
          quality: options.quality,
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

    logMessage("persisting image");

    const imagesPersistenceHandler = new ImagesPersistenceHandler(
      config,
      "exported-images",
      true,
    );

    const fileName = `${roomId}/${imageId}`;
    await imagesPersistenceHandler.persist(
      fileName,
      {
        size: imageBuffer.byteLength,
        mimeType:
          options.format === WEAVE_EXPORT_FORMATS.PNG
            ? "image/png"
            : "image/jpeg",
      },
      imageBuffer,
    );

    logMessage("image persisted");

    logMessage("sending response to parent");

    parentPort?.postMessage({ status: "OK", fileName });

    logMessage("response sent to parent");
  } catch (error) {
    console.error(`[${jobId}] error generating image: `, error);

    logMessage("sending error to parent");

    parentPort?.postMessage({
      status: "KO",
      error: (error as Error).message,
    });

    logMessage("error sent to parent");
  }
});

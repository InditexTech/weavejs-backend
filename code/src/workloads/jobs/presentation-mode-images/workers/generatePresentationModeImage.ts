// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { parentPort } from "worker_threads";
import sharp from "sharp";
import { renderWeaveRoom } from "../../../../canvas/weave.js";
import { ImagesPersistenceHandler } from "@/images/persistence.js";
import { GeneratePresentationModePageImagePageWorkerPayload } from "./types.js";

parentPort?.on(
  "message",
  async (params: GeneratePresentationModePageImagePageWorkerPayload) => {
    const { jobId, instanceId, pageId, config, roomData, options, type } =
      params;

    const logMessage = (message: string) => {
      console.log(`[${jobId}] generate presentation image / ${message}`);
    };

    try {
      logMessage(`rendering room [${type}]`);

      const { instance, destroy } = await renderWeaveRoom(config, roomData);

      logMessage(`generating image`);

      let exportFunction = undefined;

      if (type === "area") {
        exportFunction = async () => {
          return await instance.exportAreaServerSide(params.area, {
            format: "image/jpeg",
            padding: options.padding,
            pixelRatio: 1,
            backgroundColor: "#FFFFFF",
            quality: 1,
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

      const imagePipeline = composedImage.jpeg({
        quality: 100,
      });

      logMessage("getting image buffer");

      const imageBuffer = await imagePipeline.toBuffer();

      logMessage("image buffer obtained");

      logMessage("persisting image");

      const imagesPersistenceHandler = new ImagesPersistenceHandler(
        config,
        "presentation-images",
        true,
      );

      const fileName = `${instanceId}/${pageId}`;
      await imagesPersistenceHandler.persist(
        fileName,
        { size: imageBuffer.byteLength, mimeType: "image/jpeg" },
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
  },
);

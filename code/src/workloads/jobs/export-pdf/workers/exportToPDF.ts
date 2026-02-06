// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { PDFDocument } from "pdf-lib";
import { parentPort } from "worker_threads";
import sharp from "sharp";
import { renderWeaveRoom } from "../../../../canvas/weave.js";

parentPort?.on(
  "message",
  async ({
    config,
    roomData,
    pages,
    options,
  }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: any;
    roomData: string;
    pages: { title: string; nodes: string[] }[];
    options: {
      backgroundColor: string;
      padding: number;
      pixelRatio: number;
    };
  }) => {
    try {
      const { instance, destroy } = await renderWeaveRoom(config, roomData);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const imagesForPages: any[] = [];

      if (pages.length === 0) {
        const { composites, width, height } =
          await instance.exportNodesServerSide([], (nodes) => nodes, {
            format: "image/png",
            padding: options.padding,
            pixelRatio: options.pixelRatio,
            backgroundColor: options.backgroundColor,
          });

        imagesForPages.push({ composites, width, height });
      } else {
        for (const page of pages) {
          const { composites, width, height } =
            await instance.exportNodesServerSide(page.nodes, (nodes) => nodes, {
              format: "image/png",
              padding: options.padding,
              pixelRatio: options.pixelRatio,
              backgroundColor: options.backgroundColor,
            });

          imagesForPages.push({ page, composites, width, height });
        }
      }

      destroy();

      // Create a new PDFDocument
      const pdfDoc = await PDFDocument.create();

      for (const image of imagesForPages) {
        // Add a blank A4 page to the document
        const page = pdfDoc.addPage([842, 595]);

        // Get the width and height of the page
        const { width: pageWidth, height: pageHeight } = page.getSize();

        const composedImage = sharp({
          create: {
            width: image.width,
            height: image.height,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          },
        }).composite(image.composites);

        let imagePipeline = composedImage;
        imagePipeline = composedImage.png();

        const imageBuffer = await imagePipeline.toBuffer();

        const pdfImage = await pdfDoc.embedPng(imageBuffer);

        // Get image dimensions
        const { width: imageWidth, height: imageHeight } = pdfImage;

        const scale = Math.min(
          pageWidth / imageWidth,
          pageHeight / imageHeight,
        );
        const scaledWidth = imageWidth * scale;
        const scaledHeight = imageHeight * scale;

        const x = (pageWidth - scaledWidth) / 2;
        const y = (pageHeight - scaledHeight) / 2;

        // Draw image on page
        page.drawImage(pdfImage, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });
      }

      const pdfBytes = await pdfDoc.save();

      const buffer = pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset + pdfBytes.byteLength,
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
        "utf8",
      );
      const ab = buffer.buffer.slice(
        buffer.byteOffset,
        buffer.byteOffset + buffer.byteLength,
      );
      parentPort?.postMessage(ab, [ab as ArrayBuffer]);
    }
  },
);

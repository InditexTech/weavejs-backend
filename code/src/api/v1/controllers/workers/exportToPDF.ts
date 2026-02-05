// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { PDFDocument } from "pdf-lib";
import { parentPort } from "worker_threads";
import sharp from "sharp";
import { renderWeaveRoom } from "../../../../canvas/weave.js";

const startMeasureExecutionTime = (
  event: string,
): { event: string; start: [number, number] } => {
  const start = process.hrtime();
  return { event, start };
};

const endMeasureExecutionTime = (event: {
  event: string;
  start: [number, number];
}) => {
  const precision = 3;
  const [sec, nano] = process.hrtime(event.start);
  const ms = nano / 1_000_000;

  const secStr = String(sec).padStart(3, " "); // e.g. "  2", "123"
  const msStr = ms.toFixed(precision).padStart(7); // e.g. "  0.123"

  console.log(`${secStr} s, ${msStr} ms - ${event.event}`);
};

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
      const total = startMeasureExecutionTime("Total render time");
      const event = startMeasureExecutionTime("Render canvas");
      const { instance, destroy } = await renderWeaveRoom(config, roomData);
      endMeasureExecutionTime(event);

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
          console.log("rendering page", page.title);
          const event = startMeasureExecutionTime(
            `Render page canvas [${page.title}]`,
          );
          const { composites, width, height } =
            await instance.exportNodesServerSide(page.nodes, (nodes) => nodes, {
              format: "image/png",
              padding: options.padding,
              pixelRatio: options.pixelRatio,
              backgroundColor: options.backgroundColor,
            });
          endMeasureExecutionTime(event);

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

        const event = startMeasureExecutionTime(
          `Compose image for PDF [${image.page.title}]`,
        );
        const composedImage = sharp({
          create: {
            width: image.width,
            height: image.height,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          },
        }).composite(image.composites);
        endMeasureExecutionTime(event);

        let imagePipeline = composedImage;
        imagePipeline = composedImage.png();

        const imageBuffer = await imagePipeline.toBuffer();

        const event2 = startMeasureExecutionTime(
          `Embed image for PDF [${image.page.title}]`,
        );
        const pdfImage = await pdfDoc.embedPng(imageBuffer);
        endMeasureExecutionTime(event2);

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

        const event3 = startMeasureExecutionTime(
          `Draw image for PDF [${image.page.title}]`,
        );
        // Draw image on page
        page.drawImage(pdfImage, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });
        endMeasureExecutionTime(event3);
      }

      const event2 = startMeasureExecutionTime("Save PDF");
      const pdfBytes = await pdfDoc.save();
      endMeasureExecutionTime(event2);

      const buffer = pdfBytes.buffer.slice(
        pdfBytes.byteOffset,
        pdfBytes.byteOffset + pdfBytes.byteLength,
      );

      const event3 = startMeasureExecutionTime("Send PDF buffer to parent");
      parentPort?.postMessage(buffer, [buffer as ArrayBuffer]);
      endMeasureExecutionTime(event3);

      endMeasureExecutionTime(total);
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

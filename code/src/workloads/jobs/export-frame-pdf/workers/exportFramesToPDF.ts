// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { parentPort } from "worker_threads";
import sharp from "sharp";
import { renderWeaveRoom } from "../../../../canvas/weave.js";
import { ImagesPersistenceHandler } from "@/images/persistence.js";
import { ExportFramesToPdfWorkerPayload } from "./types.js";

parentPort?.on(
  "message",
  async ({
    config,
    roomId,
    pdfId,
    roomData,
    pages,
    options,
  }: ExportFramesToPdfWorkerPayload) => {
    try {
      const { instance, destroy } = await renderWeaveRoom(config, roomData);

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfPages: any[] = [];

      if (pages.length === 0) {
        const { composites, width, height } =
          await instance.exportNodesServerSide([], (nodes) => nodes, {
            format: "image/png",
            padding: options.padding,
            pixelRatio: options.pixelRatio,
            backgroundColor: options.backgroundColor,
          });

        pdfPages.push({ composites, width, height });
      } else {
        for (const page of pages) {
          const { composites, width, height } =
            await instance.exportNodesServerSide(page.nodes, (nodes) => nodes, {
              format: "image/png",
              padding: options.padding,
              pixelRatio: options.pixelRatio,
              backgroundColor: options.backgroundColor,
            });

          pdfPages.push({ page, composites, width, height });
        }
      }

      destroy();

      // Create a new PDFDocument
      const pdfDoc = await PDFDocument.create();

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

      for (let i = 0; i < pdfPages.length; i++) {
        const pageInfo = pdfPages[i];

        // Add a blank A4 page to the document
        const page = pdfDoc.addPage([842, 595]);

        // Get the width and height of the page
        const { width: pageWidth, height: pageHeight } = page.getSize();
        // Safe area
        const margin = 40;
        const safeWidth = pageWidth - margin * 2;
        const safeHeight = pageHeight - margin * 2;

        const composedImage = sharp({
          create: {
            width: pageInfo.width,
            height: pageInfo.height,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 0 },
          },
        }).composite(pageInfo.composites);

        let imagePipeline = composedImage;
        imagePipeline = composedImage.png();

        const imageBuffer = await imagePipeline.toBuffer();

        const pdfImage = await pdfDoc.embedPng(imageBuffer);

        // Get image dimensions
        const { width: imageWidth, height: imageHeight } = pdfImage;

        const scale = Math.min(
          safeWidth / imageWidth,
          safeHeight / imageHeight,
        );
        const scaledWidth = imageWidth * scale;
        const scaledHeight = imageHeight * scale;

        const x = margin + (safeWidth - scaledWidth) / 2;
        const y = margin;

        const leftText = pageInfo.page ? pageInfo.page.title : "";
        const rightText = `Frame ${i + 1} of ${pdfPages.length}`;

        // Title
        const titleFontSize = 20;
        const titleTextHeight = font.heightAtSize(titleFontSize);

        page.drawText(leftText, {
          x: margin,
          y: pageHeight - margin - titleTextHeight,
          size: titleFontSize,
          font,
          color: rgb(0, 0, 0),
        });

        // Page index
        const indexFontSize = 14;
        const indexTextWidth = fontMono.widthOfTextAtSize(
          rightText,
          indexFontSize,
        );
        const indexTextHeight = fontMono.heightAtSize(indexFontSize);

        page.drawText(rightText, {
          x: pageWidth - margin - indexTextWidth,
          y: pageHeight - margin - indexTextHeight,
          size: indexFontSize,
          font: fontMono,
          color: rgb(201 / 255, 201 / 255, 201 / 255), // #c9c9c9
        });

        // Draw image on page
        page.drawImage(pdfImage, {
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
        });

        // Draw a border around the image
        page.drawRectangle({
          x,
          y,
          width: scaledWidth,
          height: scaledHeight,
          borderWidth: 1,
          borderColor: rgb(201 / 255, 201 / 255, 201 / 255), // #c9c9c9
        });
      }

      const pdfBytes = await pdfDoc.save();

      const imagesPersistenceHandler = new ImagesPersistenceHandler(
        config,
        "exported-pdf",
        true,
      );

      const fileName = `${roomId}/${pdfId}`;
      await imagesPersistenceHandler.persist(
        fileName,
        { size: pdfBytes.byteLength, mimeType: "application/pdf" },
        pdfBytes,
      );

      parentPort?.postMessage({ status: "OK", fileName });
    } catch (error) {
      parentPort?.postMessage({
        status: "KO",
        error: (error as Error).message,
      });
    }
  },
);

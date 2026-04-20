// SPDX-FileCopyrightText: 2025 2025 INDUSTRIA DE DISEÑO TEXTIL S.A. (INDITEX S.A.)
//
// SPDX-License-Identifier: Apache-2.0

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { parentPort } from "worker_threads";
import { ExportRoomToPdfWorkerPayload } from "./types.js";
import { ImagesPersistenceHandler } from "@/images/persistence.js";
import { Readable } from "node:stream";

async function streamToBuffer(readable: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of readable) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

parentPort?.on(
  "message",
  async ({ roomId, pdfId, config, pages }: ExportRoomToPdfWorkerPayload) => {
    try {
      const imagesPersistenceHandler = new ImagesPersistenceHandler(
        config,
        "exported-images",
        true,
      );

      // Create a new PDFDocument
      const pdfDoc = await PDFDocument.create();

      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontMono = await pdfDoc.embedFont(StandardFonts.Courier);

      for (let i = 0; i < pages.length; i++) {
        const actPage = pages[i];

        // Add a blank A4 page to the document
        const page = pdfDoc.addPage([842, 595]);

        // Get the width and height of the page
        const { width: pageWidth, height: pageHeight } = page.getSize();
        // Safe area
        const margin = 40;
        const safeWidth = pageWidth - margin * 2;
        const safeHeight = pageHeight - margin * 2;

        // GET IMAGE

        const existsImage = await imagesPersistenceHandler.exists(
          actPage.imageURL,
        );

        if (!existsImage) {
          throw new Error(`Image ${actPage.imageURL} not found`);
        }

        const { response } = await imagesPersistenceHandler.fetch(
          actPage.imageURL,
        );

        if (!response?.readableStreamBody) {
          throw new Error(`Image ${actPage.imageURL} not found`);
        }

        const buffer = await streamToBuffer(
          response.readableStreamBody as Readable,
        );

        const pdfImage = await pdfDoc.embedPng(buffer);

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

        const leftText = actPage.pageInfo ? actPage.pageInfo.name : "";
        const rightText = `Page ${i + 1} of ${pages.length}`;

        // Title
        const titleFontSize = 24;
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

      const pdfPersistenceHandler = new ImagesPersistenceHandler(
        config,
        "exported-pdf",
        true,
      );

      const fileName = `${roomId}/${pdfId}`;
      await pdfPersistenceHandler.persist(
        fileName,
        { size: pdfBytes.byteLength, mimeType: "application/pdf" },
        pdfBytes,
      );

      parentPort?.postMessage({ status: "OK", fileName });
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
